import React from "react";
import { useParams } from "react-router-dom";
import { MiniAppBidiText } from "../components/MiniAppBidiText";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { ManagerAmount, ManagerGrid, ManagerLedgerRows, ManagerList, ManagerMetric, ManagerPage, ManagerPager, ManagerQueryState, ManagerRecord, ManagerSection, useManagerListLocation } from "../components/manager/ManagerUI";
import { formatCustomerDate, formatPartnerType } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { useMiniAppPermissions } from "../permission/MiniAppPermissionContext";
import type { ManagerPartnerAccountingBreakdownData, ManagerPartnerDetailData, PartnerLedgerData, PartnerPhoneData, PartnerPurchasesData } from "../types";
const Purchases: React.FC<{ id: string }> = ({ id }) => {
  const { page, setPage } = useManagerListLocation("purchasesPage");
  const query = useMiniAppQuery<PartnerPurchasesData>(`/api/miniapp/manager/partners/${id}/purchases?page=${page}&pageSize=10`, { availability: "secondary" });
  const d = query.data;
  return <ManagerSection title="تأمین‌های ثبت‌شده"><ManagerQueryState query={query} empty={!d?.items.length} emptyText="تأمینی در این صفحه ثبت نشده است."><ManagerList>{d?.items.map(item => <ManagerRecord key={item.ref} title={item.name} detail={`${formatCustomerDate(item.purchaseDate)} · ${item.quantity.toLocaleString("fa-IR")} ${item.unit}`}><ManagerAmount label="مبلغ تأمین" value={item.supplyAmount} field={`supply-${item.ref}`} /></ManagerRecord>)}</ManagerList></ManagerQueryState>{d && !query.loading && !query.error && <ManagerPager {...d} onPage={setPage} meta={query.meta} />}</ManagerSection>;
};
const Settlements: React.FC<{ id: string }> = ({ id }) => {
  const { page, setPage } = useManagerListLocation("settlementsPage");
  const query = useMiniAppQuery<PartnerPhoneData>(`/api/miniapp/manager/partners/${id}/settlements?page=${page}&pageSize=10`, { availability: "secondary" });
  const d = query.data;
  return <ManagerSection title="سوابق تسویه گوشی‌ها"><ManagerQueryState query={query} empty={!d?.items.length} emptyText="رکورد تسویه‌ای در این صفحه وجود ندارد."><ManagerList>{d?.items.map(item => <ManagerRecord key={item.ref} title={item.name} detail={item.settlement.label}><ManagerAmount label="مبلغ تسویه" value={item.settlement.amount} /><ManagerAmount label="پرداخت‌شده" value={item.settlement.paidAmount} /><ManagerAmount label="مانده تسویه" value={item.settlement.remainingAmount} field={`settlement-${item.ref}`} /></ManagerRecord>)}</ManagerList></ManagerQueryState>{d && !query.loading && !query.error && <ManagerPager {...d} onPage={setPage} meta={query.meta} />}</ManagerSection>;
};
const Accounting: React.FC<{ id: string }> = ({ id }) => {
  const query = useMiniAppQuery<ManagerPartnerAccountingBreakdownData>(`/api/miniapp/manager/partners/${id}/accounting-breakdown`, { availability: "secondary" });
  const d = query.data;
  return <ManagerSection title="سهم سود ثبت‌شده" description="مقادیر تخصیص‌یافته در گزارش حسابداری؛ بدون محاسبه مجدد"><ManagerQueryState query={query}>{d && <>
    <ManagerGrid><ManagerMetric label="سهم سود تجمیعی" value={d.summary.profitShareAccrued} field="profitShareAccrued" /><ManagerMetric label="تعداد تخصیص سود" value={d.summary.profitAllocationCount} money={false} /></ManagerGrid>
    <p className="manager-muted">تخصیص‌های موجود در این گزارش: {d.profitAllocations.length.toLocaleString("fa-IR")}</p>
    <ManagerQueryState query={query} empty={!d.profitAllocations.length} emptyText="تخصیصی در این گزارش وجود ندارد."><ManagerList>{d.profitAllocations.map(item => <ManagerRecord key={item.id} title={item.itemDescription || "تخصیص سود"} detail={`${item.sharePercent.toLocaleString("fa-IR")}٪ · ${formatCustomerDate(item.saleDate)}`}><ManagerAmount label="مبلغ سهم ثبت‌شده" value={item.amount} field={`allocation-${item.id}`} /></ManagerRecord>)}</ManagerList></ManagerQueryState>
  </>}</ManagerQueryState></ManagerSection>;
};
const Ledger: React.FC<{ id: string }> = ({ id }) => {
  const { page, setPage } = useManagerListLocation("ledgerPage");
  const query = useMiniAppQuery<PartnerLedgerData>(`/api/miniapp/manager/partners/${id}/ledger?page=${page}&pageSize=20`, { availability: "secondary" });
  const d = query.data;
  return <ManagerSection title="دفتر حساب" description="بدهکار و بستانکار هر ردیف مستقل نمایش داده می‌شوند"><ManagerQueryState query={query} empty={!d?.items.length} emptyText="گردش حسابی در این صفحه ثبت نشده است.">{d && <ManagerLedgerRows items={d.items} />}</ManagerQueryState>{d && !query.loading && !query.error && <ManagerPager {...d} onPage={setPage} meta={query.meta} />}</ManagerSection>;
};
export const ManagerPartnerDetail: React.FC = () => {
  const { id = "" } = useParams();
  const { canPermission: can } = useMiniAppPermissions();
  const query = useMiniAppQuery<ManagerPartnerDetailData>(`/api/miniapp/manager/partners/${id}`);
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} empty={!query.loading && !query.error} emptyText="اطلاعات این بخش در دسترس نیست." />;
  const d = query.data;
  return <ManagerPage title={d.partner.name} context={`پرونده همکار · ${d.partner.id.toLocaleString("fa-IR")}`} description={<>{formatPartnerType(d.partner.type)}{d.partner.phoneNumber && <> · <MiniAppBidiText>{d.partner.phoneNumber}</MiniAppBidiText></>}</>}>
    <ManagerSection title="خلاصه همکاری" description="مجموع سوابق در زمان گزارش؛ محدود به امروز نیست"><ManagerGrid>
      <ManagerMetric label="تأمین ثبت‌شده" value={d.supplied.total} money={false} /><ManagerMetric label="جمع مبلغ تأمین" value={d.supplied.totalSupplyAmount} field="totalSupplyAmount" />
      {can("partners.ledger.read") && d.account && <ManagerMetric label="مانده حساب" value={d.account.account.amount} detail={d.account.account.label} field="partnerAccountAmount" />}
    </ManagerGrid></ManagerSection>
    <Purchases key={`p-${id}`} id={id} />
    {can("partners.ledger.read") && <>
      {d.phoneSettlement && <ManagerSection title="خلاصه تسویه گوشی‌ها"><ManagerGrid><ManagerMetric label="تسویه باز" value={d.phoneSettlement.open} money={false} /><ManagerMetric label="مانده تسویه" value={d.phoneSettlement.remainingAmount} field="settlementRemaining" /></ManagerGrid></ManagerSection>}
      <Settlements key={`s-${id}`} id={id} />
      {can("profits.read") && <Accounting key={`a-${id}`} id={id} />}
      <Ledger key={`l-${id}`} id={id} />
    </>}
  </ManagerPage>;
};
