import React from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "../../components/lucide-react";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppFilterChip } from "../components/MiniAppVisualPrimitives";
import { formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { useMiniAppPermissions } from "../permission/MiniAppPermissionContext";
import { MINIAPP_VISUAL_REFERENCE } from "../reference/miniAppVisualSystem";
import type { ManagerRepairListData, StaffPhoneListItem } from "../types";

type PhoneList = { items: StaffPhoneListItem[]; page: number; pageSize: number; total: number; totalPages: number };
export const ManagerOperations: React.FC = () => {
  const { canPermission } = useMiniAppPermissions();
  const canRepairs = canPermission("repairs.read"), canInventory = canPermission("inventory.read");
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "inventory" && canInventory ? "inventory" : canRepairs ? "repairs" : "inventory";
  const q = (params.get("q") || "").slice(0, 80);
  const setTab = (next: "repairs" | "inventory") => setParams(previous => { const updated = new URLSearchParams(previous); updated.set("tab", next); updated.delete("q"); return updated; });
  const setQ = (value: string) => setParams(previous => { const updated = new URLSearchParams(previous); if (value) updated.set("q", value); else updated.delete("q"); return updated; }, { replace: true });
  const repairs = useMiniAppQuery<ManagerRepairListData>(canRepairs ? `/api/miniapp/manager/repairs?q=${encodeURIComponent(q)}&page=1&pageSize=30` : "/api/miniapp/manager/me", { availability: tab === "repairs" ? "primary" : "secondary" });
  const phones = useMiniAppQuery<PhoneList>(canInventory ? `/api/miniapp/manager/inventory/phones?q=${encodeURIComponent(q)}&page=1&limit=30` : "/api/miniapp/manager/me", { availability: tab === "inventory" ? "primary" : "secondary" });
  if (!canRepairs && !canInventory) return <MiniAppDataState empty emptyText="دسترسی تعمیرات یا موجودی برای شما فعال نیست." />;
  const active = tab === "repairs" ? repairs : phones;
  return <div className={MINIAPP_VISUAL_REFERENCE.page}><header><h1 className={MINIAPP_VISUAL_REFERENCE.pageTitle}>عملیات فروشگاه</h1><p className={MINIAPP_VISUAL_REFERENCE.pageSubtitle}>تعمیرات و جستجوی موجودی، مطابق دسترسی شما</p></header>{canRepairs && canInventory ? <div className="flex gap-2"><MiniAppFilterChip active={tab === "repairs"} onClick={() => { setTab("repairs"); }}>تعمیرات</MiniAppFilterChip><MiniAppFilterChip active={tab === "inventory"} onClick={() => { setTab("inventory"); }}>موجودی</MiniAppFilterChip></div> : null}<label className={MINIAPP_VISUAL_REFERENCE.search}><Search size={19} className="text-primary"/><input dir="auto" value={q} onChange={(e) => setQ(e.target.value.slice(0,80))} placeholder={tab === "repairs" ? "نام مشتری، دستگاه یا وضعیت…" : "مدل یا IMEI…"} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none"/></label>{active.loading ? <MiniAppDataState loading /> : active.error ? <MiniAppDataState error={active.error} /> : tab === "repairs" && repairs.data ? <><div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-[var(--radius-md)] bg-muted p-2"><strong className="block text-base">{repairs.data.summary.openCount.toLocaleString("fa-IR")}</strong><span>باز</span></div><div className="rounded-[var(--radius-md)] bg-success/10 p-2 text-success"><strong className="block text-base">{repairs.data.summary.readyForPickupCount.toLocaleString("fa-IR")}</strong><span>آماده</span></div><div className="rounded-[var(--radius-md)] bg-warning/10 p-2 text-warning"><strong className="block text-base">{repairs.data.summary.waitingPartCount.toLocaleString("fa-IR")}</strong><span>قطعه</span></div></div><ul className="m-0 list-none divide-y divide-border p-0">{repairs.data.items.map(item => <li key={item.id} className="py-3"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block truncate text-sm">{item.customerName} · {item.deviceModel}</strong><small className="mt-1 block text-mutedText">{item.status} · {item.ageDays.toLocaleString("fa-IR")} روز</small></span>{item.finalCost || item.estimatedCost ? <strong className="shrink-0 text-xs">{formatToman(item.finalCost || item.estimatedCost || 0)}</strong> : null}</div></li>)}</ul></> : tab === "inventory" && phones.data ? <ul className="m-0 list-none divide-y divide-border p-0">{phones.data.items.map((item:any) => <li key={item.id} className="py-3"><strong className="block text-sm">{item.model}</strong><small className="mt-1 block break-all text-mutedText">{item.imei ? `IMEI: ${item.imei}` : "بدون IMEI"} · {item.status || "نامشخص"}</small></li>)}</ul> : <MiniAppDataState empty emptyText="موردی پیدا نشد." />}</div>;
};
