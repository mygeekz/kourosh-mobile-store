import React from "react";
import { MiniAppFilterChip, MiniAppPill } from "../components/MiniAppVisualPrimitives";
import { ManagerAmount, ManagerList, ManagerPage, ManagerPager, ManagerQueryState, ManagerRecord, useManagerListLocation } from "../components/manager/ManagerUI";
import { formatCustomerDate } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { StaffDueData } from "../types";
const scopes = [{ key: "overdue", label: "معوق" }, { key: "today", label: "امروز" }, { key: "next7", label: "۷ روز آینده" }] as const;
export const ManagerDues: React.FC = () => {
  const { params, page, update, setPage } = useManagerListLocation();
  const scope = scopes.find(item => item.key === params.get("scope"))?.key || "overdue";
  const query = useMiniAppQuery<StaffDueData>(`/api/miniapp/manager/installments/due?scope=${scope}&page=${page}&pageSize=30`);
  const d = query.data;
  return <ManagerPage title="اقساط و سررسیدها" description={scope === "overdue" ? "مانده اقساطی که تاریخ سررسیدشان گذشته است" : scope === "today" ? "مانده پرداخت‌نشده اقساط سررسید امروز" : "سررسیدهای فردا تا هفت روز آینده"}>
    <div className="manager-actions" aria-label="بازه سررسید">{scopes.map(item => <MiniAppFilterChip key={item.key} active={scope === item.key} onClick={() => update("scope", item.key)}>{item.label}</MiniAppFilterChip>)}</div>
    <ManagerQueryState query={query} empty={d?.items.length === 0} emptyText="قسطی در این صفحه و بازه وجود ندارد."><ManagerList>{d?.items.map(item => <ManagerRecord key={item.paymentId} title={item.customerName} detail={`قرارداد ${item.saleId.toLocaleString("fa-IR")} · سررسید ${formatCustomerDate(item.dueDate)}`} to={`/installments/${item.saleId}`}>
      <span><MiniAppPill tone={item.status === "overdue" ? "danger" : "muted"}>{item.status === "overdue" ? `${item.overdueDays.toLocaleString("fa-IR")} روز تأخیر` : item.status === "today" ? "سررسید امروز" : "سررسید آینده"}</MiniAppPill></span>
      <ManagerAmount label="مانده پرداخت‌نشده" value={item.remainingAmount} field={`due-${item.paymentId}`} />
    </ManagerRecord>)}</ManagerList></ManagerQueryState>
    {d && !query.loading && !query.error && <ManagerPager {...d} meta={query.meta} onPage={setPage} />}
  </ManagerPage>;
};
