import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "../../components/lucide-react";
import { MiniAppBidiText } from "../components/MiniAppBidiText";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppFilterChip } from "../components/MiniAppVisualPrimitives";
import { formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { useMiniAppPermissions } from "../permission/MiniAppPermissionContext";
import { MINIAPP_VISUAL_REFERENCE } from "../reference/miniAppVisualSystem";
import type { ManagerCustomerDirectoryData, ManagerPartnerDirectoryData } from "../types";

export const ManagerDirectory: React.FC = () => {
  const { canPermission } = useMiniAppPermissions();
  const canCustomers = canPermission("customers.read");
  const canPartners = canPermission("partners.read");
  const [params, setParams] = useSearchParams();
  const requested = params.get("type");
  const kind = requested === "partner" && canPartners ? "partner" : canCustomers ? "customer" : "partner";
  const input = (params.get("q") || "").slice(0, 80);
  const [debouncedQuery, setDebouncedQuery] = useState(input.trim());

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(input.trim()), input.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [input]);

  const allowedKind = (kind === "customer" && canCustomers) || (kind === "partner" && canPartners);
  const path = allowedKind
    ? `/api/miniapp/manager/${kind === "customer" ? "customers" : "partners"}?q=${encodeURIComponent(debouncedQuery)}&page=1&pageSize=30`
    : "/api/miniapp/manager/me";
  const query = useMiniAppQuery<ManagerCustomerDirectoryData | ManagerPartnerDirectoryData>(path);
  const items = useMemo(() => allowedKind ? query.data?.items || [] : [], [allowedKind, query.data]);

  if (!canCustomers && !canPartners) return <MiniAppDataState empty emptyText="دسترسی مشاهده مشتری یا همکار برای شما فعال نیست." />;
  const switchKind = (next: "customer" | "partner") => { setParams(previous => { const updated = new URLSearchParams(previous); updated.set("type", next); return updated; }); };
  const setInput = (value: string) => setParams(previous => { const updated = new URLSearchParams(previous); if (value) updated.set("q", value); else updated.delete("q"); return updated; }, { replace: true });
  return (
    <div className={MINIAPP_VISUAL_REFERENCE.page}>
      <header><h1 className={MINIAPP_VISUAL_REFERENCE.pageTitle}>مشتری و همکار</h1><p className={MINIAPP_VISUAL_REFERENCE.pageSubtitle}>جستجوی مستقیم در اطلاعات اصلی فروشگاه</p></header>
      {canCustomers && canPartners ? <div className="flex gap-2"><MiniAppFilterChip active={kind === "customer"} onClick={() => switchKind("customer")}>مشتریان</MiniAppFilterChip><MiniAppFilterChip active={kind === "partner"} onClick={() => switchKind("partner")}>همکاران</MiniAppFilterChip></div> : null}
      <label className={MINIAPP_VISUAL_REFERENCE.search}><Search size={19} className="text-primary" aria-hidden="true" /><input dir="auto" value={input} onChange={(event) => setInput(event.target.value.slice(0, 80))} placeholder={kind === "customer" ? "نام، موبایل یا کد مشتری…" : "نام یا موبایل همکار…"} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-bold outline-none placeholder:font-normal" /></label>
      {query.loading ? <MiniAppDataState loading /> : query.error ? <MiniAppDataState error={query.error} retry={query.retry} /> : !items.length ? <MiniAppDataState empty emptyText="نتیجه‌ای پیدا نشد." /> : (
        <ul className="m-0 list-none divide-y divide-border rounded-[var(--radius-lg)] border border-border/70 bg-card px-3 p-0 shadow-sm">
          {items.map((raw: any) => {
            const id = Number(raw.id); const name = kind === "customer" ? raw.fullName : raw.name; const phone = raw.phoneNumber; const balance = raw.currentBalance;
            return <li key={`${kind}-${id}`}><Link to={`/${kind === "customer" ? "customers" : "partners"}/${id}`} className="flex min-h-16 items-center justify-between gap-3 py-3 text-foreground no-underline"><span className="min-w-0"><strong className="block truncate text-sm">{name}</strong><small className="mt-1 block text-mutedText">{phone ? <MiniAppBidiText>{phone}</MiniAppBidiText> : `شناسه ${id.toLocaleString("fa-IR")}`}</small></span>{typeof balance === "number" ? <span className={`shrink-0 text-end text-xs font-black ${balance > 0 ? "text-danger" : balance < 0 ? "text-success" : "text-mutedText"}`}>{formatToman(Math.abs(balance))}</span> : <span className="text-xs text-primary">مشاهده</span>}</Link></li>;
          })}
        </ul>
      )}
    </div>
  );
};
