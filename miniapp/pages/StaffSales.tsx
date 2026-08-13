import React from "react";
import { useSearchParams } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { StaffSalesSummary } from "../types";

const periods = [{ key: "today", label: "امروز" }, { key: "week", label: "۷ روز" }, { key: "month", label: "ماه جاری" }] as const;
export const StaffSales: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const period = periods.some((item) => item.key === params.get("period")) ? params.get("period")! : "today";
  const query = useMiniAppQuery<StaffSalesSummary>(`/api/miniapp/staff/sales-summary?period=${period}`);
  return <div><header className="mb-4"><h1 className="m-0 text-xl font-black">خلاصه فروش</h1><p className="mb-0 mt-1 text-xs text-mutedText">محاسبه مستقیم از گزارش مالی کوروش</p></header>
    <div className="grid grid-cols-3 gap-1 border-b border-border pb-3">{periods.map((item) => <button key={item.key} type="button" onClick={() => setParams({ period: item.key })} className={`min-h-10 rounded-[var(--radius-md)] px-2 text-xs font-bold ${period === item.key ? "bg-primary text-primary-foreground" : "bg-muted text-mutedText"}`}>{item.label}</button>)}</div>
    {!query.data ? <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} /> : <div><p className="my-4 text-xs text-mutedText">از {formatCustomerDate(query.data.from)} تا {formatCustomerDate(query.data.to)}</p><dl className="m-0 grid grid-cols-2 gap-x-4 text-xs"><div className="border-b border-border py-3"><dt className="text-mutedText">فروش</dt><dd className="m-0 mt-1 break-words text-lg font-black tabular-nums">{formatToman(query.data.totalRevenue)}</dd></div><div className="border-b border-border py-3"><dt className="text-mutedText">سود ناخالص</dt><dd className={`m-0 mt-1 break-words text-lg font-black tabular-nums ${query.data.grossProfit < 0 ? "text-danger" : "text-success"}`}>{formatToman(query.data.grossProfit)}</dd></div><div className="border-b border-border py-3"><dt className="text-mutedText">تعداد فروش</dt><dd className="m-0 mt-1 text-lg font-black">{query.data.totalTransactions.toLocaleString("fa-IR")}</dd></div><div className="border-b border-border py-3"><dt className="text-mutedText">میانگین فروش</dt><dd className="m-0 mt-1 break-words text-base font-black tabular-nums">{formatToman(query.data.averageSaleValue)}</dd></div></dl>{query.data.topSellingItems.length ? <section className="mt-6"><h2 className="m-0 border-b border-border pb-2 text-sm font-black">پرفروش‌ها</h2><ol className="m-0 divide-y divide-border pr-5">{query.data.topSellingItems.map((item) => <li key={`${item.itemType}-${item.id}`} className="py-3 pr-1"><div className="flex items-start justify-between gap-3"><span className="min-w-0 truncate text-sm font-bold">{item.itemName}</span><span className="shrink-0 text-xs tabular-nums">{formatToman(item.totalRevenue)}</span></div></li>)}</ol></section> : null}</div>}
  </div>;
};
