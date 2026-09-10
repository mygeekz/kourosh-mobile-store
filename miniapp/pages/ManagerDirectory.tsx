import React, { useEffect, useState } from "react";
import { MiniAppBidiText } from "../components/MiniAppBidiText";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppFilterChip } from "../components/MiniAppVisualPrimitives";
import { ManagerAmount, ManagerList, ManagerPage, ManagerPager, ManagerQueryState, ManagerRecord, ManagerSnapshotNote, useManagerListLocation } from "../components/manager/ManagerUI";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { useMiniAppPermissions } from "../permission/MiniAppPermissionContext";
import type { ManagerCustomerDirectoryData, ManagerPartnerDirectoryData } from "../types";

const DirectoryList: React.FC<{ kind: "customer" | "partner"; q: string; page: number; setPage: (page: number) => void }> = ({ kind, q, page, setPage }) => {
  const [search, setSearch] = useState(q.trim());
  useEffect(() => { const timer = window.setTimeout(() => setSearch(q.trim()), q.trim() ? 250 : 0); return () => window.clearTimeout(timer); }, [q]);
  const query = useMiniAppQuery<ManagerCustomerDirectoryData | ManagerPartnerDirectoryData>(`/api/miniapp/manager/${kind === "customer" ? "customers" : "partners"}?q=${encodeURIComponent(search)}&page=${page}&pageSize=30`);
  const d = query.data;
  return <><ManagerSnapshotNote meta={query.meta} search /><ManagerQueryState query={query} empty={!d?.items.length} emptyText="رکوردی در این صفحه پیدا نشد. جستجو یا صفحه انتخاب‌شده را بررسی کنید."><ManagerList>{d?.items.map(item => {
    const name = "fullName" in item ? item.fullName : item.name;
    const account = "account" in item ? item.account : undefined;
    const balance = item.currentBalance;
    const balanceLabel = account ? account.label : kind === "customer" && typeof balance === "number" ? balance > 0 ? "بدهکار به فروشگاه؛ مانده با علامت" : balance < 0 ? "بستانکار از فروشگاه؛ مانده با علامت" : "تسویه" : "مانده با علامت دفتر حساب";
    return <ManagerRecord key={item.id} title={name} to={`/${kind === "customer" ? "customers" : "partners"}/${item.id}`} detail={item.phoneNumber ? <MiniAppBidiText>{item.phoneNumber}</MiniAppBidiText> : `شناسه ${item.id.toLocaleString("fa-IR")} · بدون شماره تماس`}>
      {typeof balance === "number" && <ManagerAmount label={balanceLabel} value={account ? account.amount : balance} field={`directory-${item.id}`} />}
      <span className="manager-context">مشاهده پرونده ←</span>
    </ManagerRecord>;
  })}</ManagerList></ManagerQueryState>{d && !query.loading && !query.error && <ManagerPager {...d} onPage={setPage} meta={query.meta} snapshotPaging />}</>;
};
export const ManagerDirectory: React.FC = () => {
  const { canPermission } = useMiniAppPermissions();
  const canCustomers = canPermission("customers.read"), canPartners = canPermission("partners.read");
  const { params, page, update, setPage } = useManagerListLocation();
  const kind = params.get("type") === "partner" && canPartners ? "partner" : canCustomers ? "customer" : "partner";
  const q = (params.get("q") || "").slice(0, 80);
  if (!canCustomers && !canPartners) return <MiniAppDataState empty emptyText="دسترسی مشاهده مشتری یا همکار برای شما فعال نیست." />;
  return <ManagerPage title="مشتری و همکار" description="پرونده‌ها و مانده‌های مجاز؛ نتیجه جستجو از سرویس دریافت می‌شود">
    {canCustomers && canPartners && <div className="manager-actions"><MiniAppFilterChip active={kind === "customer"} onClick={() => update("type", "customer")}>مشتریان</MiniAppFilterChip><MiniAppFilterChip active={kind === "partner"} onClick={() => update("type", "partner")}>همکاران</MiniAppFilterChip></div>}
    <label className="manager-search">{kind === "customer" ? "جستجوی مشتری" : "جستجوی همکار"}<input dir="auto" value={q} maxLength={80} onChange={e => update("q", e.target.value, true)} placeholder={kind === "customer" ? "نام، موبایل یا کد مشتری…" : "نام یا موبایل همکار…"} /></label>
    <DirectoryList key={kind} kind={kind} q={q} page={page} setPage={setPage} />
  </ManagerPage>;
};
