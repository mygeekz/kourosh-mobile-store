import React from "react";
import { Link, useParams } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppPill } from "../components/MiniAppVisualPrimitives";
import { ManagerAmount, ManagerGrid, ManagerList, ManagerMetric, ManagerPage, ManagerRecord, ManagerSection } from "../components/manager/ManagerUI";
import { formatCustomerDate } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { useMiniAppPermissions } from "../permission/MiniAppPermissionContext";
import type { StaffInstallmentDetail } from "../types";
const statusLabel = { paid: "پرداخت‌شده", overdue: "معوق", today: "سررسید امروز", upcoming: "آینده" } as const;
export const ManagerInstallmentDetail: React.FC = () => {
  const { id } = useParams();
  const { canPermission } = useMiniAppPermissions();
  const query = useMiniAppQuery<StaffInstallmentDetail>(`/api/miniapp/manager/installments/${id}`);
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const d = query.data;
  return <ManagerPage title={d.itemSummary} context={`قرارداد اقساط · ${d.saleId.toLocaleString("fa-IR")}`} description={`${formatCustomerDate(d.saleDate)} · ${d.status}`}>
    {canPermission("customers.read") ? <Link to={`/customers/${d.customer.id}`} className="manager-link">پرونده مشتری: {d.customer.fullName} ←</Link> : <p className="manager-muted">مشتری: {d.customer.fullName}</p>}
    <ManagerSection title="مبالغ قرارداد" description="مقادیر ثبت‌شده در گزارش قرارداد"><ManagerGrid>
      <ManagerMetric label="مبلغ فروش" value={d.actualSalePrice} field="actualSalePrice" /><ManagerMetric label="پیش‌پرداخت" value={d.downPayment} field="downPayment" /><ManagerMetric label="پرداخت‌شده" value={d.paidAmount} field="paidAmount" /><ManagerMetric label="مانده قرارداد" value={d.remainingAmount} field="remainingAmount" />
    </ManagerGrid></ManagerSection>
    <ManagerSection title="برنامه پرداخت" description={`${d.totalInstallmentCount.toLocaleString("fa-IR")} قسط در قرارداد`}>
      {!d.paymentTimeline.length ? <MiniAppDataState empty emptyText="برنامه پرداخت در این گزارش وجود ندارد." /> : <ManagerList>{d.paymentTimeline.map(item => <ManagerRecord key={item.paymentId} title={`قسط ${item.installmentNumber.toLocaleString("fa-IR")}`} detail={`سررسید ${formatCustomerDate(item.dueDate)}`}>
        <span><MiniAppPill tone={item.status === "overdue" ? "danger" : item.status === "paid" ? "success" : "muted"}>{statusLabel[item.status]}</MiniAppPill></span>
        <ManagerAmount label="مبلغ قسط" value={item.amount} field={`payment-${item.paymentId}-amount`} /><ManagerAmount label="پرداخت‌شده" value={item.paidAmount} field={`payment-${item.paymentId}-paid`} /><ManagerAmount label="مانده قسط" value={item.remainingAmount} field={`payment-${item.paymentId}-remaining`} />
        {item.paymentDate && <p className="manager-muted">تاریخ پرداخت {formatCustomerDate(item.paymentDate)}</p>}
      </ManagerRecord>)}</ManagerList>}
    </ManagerSection>
    <ManagerSection title="چک‌های قرارداد">{!d.checks.length ? <p className="manager-muted">چکی در این گزارش ثبت نشده است.</p> : <ManagerList>{d.checks.map(item => <ManagerRecord key={item.checkId} title={item.bankName || "چک قرارداد"} detail={`${formatCustomerDate(item.dueDate)} · ${item.status}`}><ManagerAmount label="مبلغ چک" value={item.amount} field={`check-${item.checkId}`} /></ManagerRecord>)}</ManagerList>}</ManagerSection>
  </ManagerPage>;
};
