import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { StaffPhoneListItem } from "../types";

type PhoneList = { query: string; page: number; limit: number; items: StaffPhoneListItem[] };
export const StaffInventory: React.FC = () => {
  const [input, setInput] = useState("");
  const [queryValue, setQueryValue] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setQueryValue(input.trim()), 300); return () => window.clearTimeout(timer); }, [input]);
  const query = useMiniAppQuery<PhoneList>(`/api/miniapp/staff/phones?q=${encodeURIComponent(queryValue)}&page=1&limit=20`);
  return <div><header className="mb-4"><h1 className="m-0 text-xl font-black">موجودی گوشی</h1><p className="mb-0 mt-1 text-xs text-mutedText">جستجو با مدل، IMEI یا شناسه</p></header>
    <input value={input} onChange={(event) => setInput(event.target.value.slice(0, 80))} placeholder="مدل یا IMEI…" className="h-12 w-full rounded-[var(--radius-md)] border border-border bg-card px-3 text-sm outline-none focus:border-primary" />
    {!query.data ? <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} /> : query.data.items.length === 0 ? <MiniAppDataState empty emptyText="گوشی‌ای پیدا نشد." /> : <ul className="m-0 mt-3 list-none divide-y divide-border p-0">{query.data.items.map((item) => <li key={item.id}><Link to={`/phones/${item.id}`} className="block py-4 text-foreground no-underline"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block truncate text-sm">{item.model}</strong><small className="mt-1 block break-all text-mutedText">IMEI: {item.imei}</small><small className="mt-1 block text-mutedText">{[item.color, item.storage, item.ram].filter(Boolean).join(" · ")}</small></span><span className="shrink-0 text-left text-[11px] font-bold">{item.status}<small className="mt-1 block font-medium text-mutedText">{item.salePrice ? formatToman(item.salePrice) : "قیمت ثبت نشده"}</small></span></div></Link></li>)}</ul>}
  </div>;
};
