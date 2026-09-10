import React from "react";
import { useParams } from "react-router-dom";
import { MiniAppBidiText } from "../components/MiniAppBidiText";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { ManagerAmount, ManagerGrid, ManagerLedgerRows, ManagerList, ManagerMetric, ManagerPage, ManagerPager, ManagerQueryState, ManagerRecord, ManagerSection, useManagerListLocation } from "../components/manager/ManagerUI";
import { formatCustomerDate } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { useMiniAppPermissions } from "../permission/MiniAppPermissionContext";
import type { CustomerInstallmentSummary, ManagerCustomerDetailData, ManagerCustomerLedgerData, ManagerCustomerPurchasesData } from "../types";

const Purchases: React.FC<{ id: string }> = ({ id }) => {
  const { page, setPage } = useManagerListLocation("purchasesPage");
  const query = useMiniAppQuery<ManagerCustomerPurchasesData>(`/api/miniapp/manager/customers/${id}/purchases?page=${page}&pageSize=10`, { availability: "secondary" });
  const d = query.data;
  return <ManagerSection title="خریدهای مشتری"><ManagerQueryState query={query} empty={!d?.items.length} emptyText="خریدی در این صفحه ثبت نشده است."><ManagerList>{d?.items.map(item => <ManagerRecord key={item.ref} title={item.itemsSummary} detail={`${formatCustomerDate(item.transactionDate)} · ${item.purchaseTypeLabel}`}><ManagerAmount label="مبلغ خرید" value={item.totalAmount} field={`purchase-${item.id}`} /></ManagerRecord>)}</ManagerList></ManagerQueryState>{d && !query.loading && !query.error && <ManagerPager page={d.page} hasMore={d.hasMore} onPage={setPage} meta={query.meta} />}</ManagerSection>;
};
const Installments: React.FC<{ id: string }> = ({ id }) => {
  const query = useMiniAppQuery<CustomerInstallmentSummary[]>(`/api/miniapp/manager/customers/${id}/installments`, { availability: "secondary" });
  return <ManagerSection title="قراردادهای اقساطی"><ManagerQueryState query={query} empty={!query.data?.length} emptyText="قرارداد اقساطی در این گزارش وجود ندارد."><ManagerList>{query.data?.map(item => <ManagerRecord key={item.id} title={item.itemsSummary} to={`/installments/${item.id}`} detail={`${item.status} · ${item.overdueCount.toLocaleString("fa-IR")} قسط معوق${item.nextDueDate ? ` · سررسید بعدی ${formatCustomerDate(item.nextDueDate)}` : ""}`}><ManagerAmount label="مانده قرارداد" value={item.remainingAmount} /></ManagerRecord>)}</ManagerList></ManagerQueryState></ManagerSection>;
};
const Ledger: React.FC<{ id: string }> = ({ id }) => {
  const { page, setPage } = useManagerListLocation("ledgerPage");
  const query = useMiniAppQuery<ManagerCustomerLedgerData>(`/api/miniapp/manager/customers/${id}/ledger?page=${page}&pageSize=20`, { availability: "secondary" });
  const d = query.data;
  return <ManagerSection title="دفتر حساب" description="مبالغ بدهکار، بستانکار و مانده دقیقاً مطابق دفتر حساب"><ManagerQueryState query={query}>{d && <>
    {d.summary && <ManagerGrid><ManagerMetric label="جمع بدهکار" value={d.summary.totalDebit} /><ManagerMetric label="جمع بستانکار" value={d.summary.totalCredit} /></ManagerGrid>}
    <ManagerQueryState query={query} empty={!d.items.length} emptyText="گردش حسابی در این صفحه ثبت نشده است."><ManagerLedgerRows items={d.items} /></ManagerQueryState><ManagerPager {...d} onPage={setPage} meta={query.meta} />
  </>}</ManagerQueryState></ManagerSection>;
};
export const ManagerCustomerDetail: React.FC = () => {
  const { id = "" } = useParams();
  const { canPermission: can } = useMiniAppPermissions();
  const query = useMiniAppQuery<ManagerCustomerDetailData>(`/api/miniapp/manager/customers/${id}`);
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const d = query.data;
  return <ManagerPage title={d.customer.fullName} context={`پرونده مشتری · ${d.customer.id.toLocaleString("fa-IR")}`} description={d.customer.phoneNumber ? <MiniAppBidiText>{d.customer.phoneNumber}</MiniAppBidiText> : "شماره تماس ثبت نشده"}>
    {d.customer.address && <p className="manager-muted">نشانی: {d.customer.address}</p>}
    {can("customers.ledger.read") && d.account && <ManagerSection title="حساب مشتری" description="مانده حساب در زمان گزارش"><ManagerGrid>
      <ManagerMetric label="مانده حساب" value={d.account.account.amount} detail={d.account.account.label} field="customerAccountAmount" /><ManagerMetric label="جمع بستانکار دفتر حساب" value={d.account.totalCredit} field="customerTotalCredit" />
    </ManagerGrid></ManagerSection>}
    {(d.purchases || d.installments) && <ManagerSection title="خلاصه سوابق" description="مجموع سوابق گزارش‌شده؛ محدود به امروز نیست"><ManagerGrid>
      {can("sales.read") && <><ManagerMetric label="تعداد خرید" value={d.purchases?.count} money={false} /><ManagerMetric label="جمع مبلغ خریدها" value={d.purchases?.totalAmount} /></>}
      {can("installments.read") && <><ManagerMetric label="قراردادهای فعال" value={d.installments?.activeCount} money={false} /><ManagerMetric label="اقساط معوق" value={d.installments?.overdueCount} money={false} /></>}
    </ManagerGrid></ManagerSection>}
    {can("sales.read") && <Purchases key={`p-${id}`} id={id} />}
    {can("installments.read") && <Installments key={`i-${id}`} id={id} />}
    {can("customers.ledger.read") && <Ledger key={`l-${id}`} id={id} />}
  </ManagerPage>;
};
