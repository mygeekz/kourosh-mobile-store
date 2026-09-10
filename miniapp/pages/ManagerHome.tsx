import React from "react";
import { Navigate } from "react-router-dom";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { ManagerAmount, ManagerGrid, ManagerList, ManagerMetric, ManagerPage, ManagerRecord, ManagerSection } from "../components/manager/ManagerUI";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { useMiniAppPermissions } from "../permission/MiniAppPermissionContext";
import { formatCustomerDate } from "../format";
import type { ManagerDashboardData } from "../types";

const ManagerDashboard: React.FC = () => {
  const { identity } = useMiniAppAuth();
  const { canPermission: can } = useMiniAppPermissions();
  const query = useMiniAppQuery<ManagerDashboardData>("/api/miniapp/manager/dashboard");
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const w = query.data.widgets;
  // Provenance remains owned by the existing shell. Dates describe this response, not the device clock.
  return <ManagerPage title="نمای روزانه فروشگاه" context="فضای کاری مدیریت" description={<>{identity?.displayName} · تاریخ گزارش {formatCustomerDate(query.data.generatedAt)}</>}>
    {(w.installments || w.repairs) && <ManagerSection title="پیگیری امروز" description="سررسیدها و کارهای در انتظار رسیدگی">
      <ManagerList>
        {w.installments && <>
          <ManagerRecord title={`اقساط معوق · ${w.installments.overdueCount.toLocaleString("fa-IR")} مورد`} detail="سررسید گذشته؛ مانده پرداخت‌نشده" to={can("installments.read") ? "/dues?scope=overdue" : undefined}><ManagerAmount label="مبلغ معوق" value={w.installments.overdueAmount} field="overdueAmount" /></ManagerRecord>
          <ManagerRecord title={`سررسید امروز · ${w.installments.dueTodayCount.toLocaleString("fa-IR")} مورد`} to={can("installments.read") ? "/dues?scope=today" : undefined}><ManagerAmount label="مانده سررسید امروز" value={w.installments.dueTodayAmount} field="dueTodayAmount" /></ManagerRecord>
          <ManagerRecord title={`۷ روز آینده · ${w.installments.next7Count.toLocaleString("fa-IR")} مورد`} detail="از فردا تا هفت روز پس از تاریخ گزارش" to={can("installments.read") ? "/dues?scope=next7" : undefined}><ManagerAmount label="مانده سررسیدهای آینده" value={w.installments.next7Amount} field="next7Amount" /></ManagerRecord>
        </>}
        {w.repairs && <ManagerRecord title={`تعمیرات باز · ${w.repairs.openCount.toLocaleString("fa-IR")} مورد`} detail={`${w.repairs.readyForPickupCount.toLocaleString("fa-IR")} آماده تحویل · ${w.repairs.waitingPartCount.toLocaleString("fa-IR")} منتظر قطعه`} to={can("repairs.read") ? "/operations?tab=repairs" : undefined}>{w.repairs.oldestOpen && <p className="manager-muted">قدیمی‌ترین کار باز: {w.repairs.oldestOpen.customerName} · {w.repairs.oldestOpen.deviceModel} · {w.repairs.oldestOpen.status} · {w.repairs.oldestOpen.ageDays.toLocaleString("fa-IR")} روز</p>}</ManagerRecord>}
      </ManagerList>
    </ManagerSection>}
    {(w.sales || w.profit) && <ManagerSection title="فروش امروز" description="عملکرد روز گزارش؛ سود ناخالص پیش از هزینه‌های عملیاتی" to={can("sales.read") || can("profits.read") ? "/sales?period=today" : undefined} action="گزارش فروش"><ManagerGrid>
      <ManagerMetric label="مبلغ فروش امروز" value={w.sales?.todayAmount} field="todayAmount" />
      <ManagerMetric label="سود ناخالص امروز" value={w.profit?.todayGrossProfit} field="todayGrossProfit" detail={w.profit && w.profit.todayGrossProfit < 0 ? "مقدار منفی: زیان ناخالص" : undefined} />
      <ManagerMetric label="تعداد فروش امروز" value={w.sales?.todayTransactions} money={false} />
      <ManagerMetric label="میانگین مبلغ هر فروش امروز" value={w.sales?.averageSaleValue} field="averageSaleValue" />
    </ManagerGrid></ManagerSection>}
    {w.customerReceivables && <ManagerSection title="حساب مشتریان" description="مانده تجمیعی در زمان گزارش؛ محدود به فروش امروز نیست" to={can("customers.read") ? "/directory?type=customer" : undefined} action="فهرست مشتریان"><ManagerGrid>
      <ManagerMetric label="مطالبات از مشتریان" value={w.customerReceivables.totalReceivables} field="totalReceivables" detail={`${w.customerReceivables.debtorsCount.toLocaleString("fa-IR")} مشتری بدهکار`} />
      <ManagerMetric label="بستانکاری مشتریان" value={w.customerReceivables.totalCustomerCredit} field="totalCustomerCredit" detail={`${w.customerReceivables.creditorsCount.toLocaleString("fa-IR")} مشتری بستانکار`} />
    </ManagerGrid></ManagerSection>}
    {w.partnerAccounts && <ManagerSection title="مانده همکاران" description="تجمیع علامت‌های دفتر حساب در زمان گزارش؛ وضعیت بدهکار یا بستانکار در پرونده هر همکار مشخص است" to={can("partners.read") ? "/directory?type=partner" : undefined} action="فهرست همکاران"><ManagerGrid>
      <ManagerMetric label="جمع مانده‌های مثبت" value={w.partnerAccounts.positiveBalanceAmount} field="positiveBalanceAmount" detail={`${w.partnerAccounts.positiveBalanceCount.toLocaleString("fa-IR")} همکار با مانده مثبت`} />
      <ManagerMetric label="مقدار مانده‌های منفی" value={w.partnerAccounts.negativeBalanceAmount} field="negativeBalanceAmount" detail={`${w.partnerAccounts.negativeBalanceCount.toLocaleString("fa-IR")} همکار با مانده منفی`} />
    </ManagerGrid></ManagerSection>}
    {w.inventory && <ManagerSection title="موجودی" description="تعداد اقلام فعال در زمان گزارش"><ManagerMetric label="اقلام فعال" value={w.inventory.activeItemsCount} money={false} detail="فهرست عملیات فعلاً فقط گوشی‌ها را نمایش می‌دهد." /></ManagerSection>}
    {!Object.keys(w).length && <MiniAppDataState empty emptyText="شاخصی در این گزارش در دسترس نیست. از بخش‌های مجاز زیر استفاده کنید." />}
    <ManagerSection title="ادامه کار"><ManagerList>
      {can("customers.read") && <ManagerRecord title="پرونده مشتریان" detail="اطلاعات و سوابق مجاز هر مشتری" to="/directory?type=customer" />}
      {can("partners.read") && <ManagerRecord title="پرونده همکاران" detail="اطلاعات و تأمین‌های ثبت‌شده" to="/directory?type=partner" />}
      {can("inventory.read") && <ManagerRecord title="جستجوی گوشی‌ها" detail="مدل و مشخصات موجودی" to="/operations?tab=inventory" />}
      <ManagerRecord title="اعلان‌های مدیریت" detail="پیام‌های مربوط به حساب شما" to="/notifications" />
    </ManagerList></ManagerSection>
  </ManagerPage>;
};
export const ManagerHome: React.FC = () => {
  const { canPermission } = useMiniAppPermissions();
  if (canPermission("dashboard.read")) return <ManagerDashboard />;
  if (canPermission("customers.read") || canPermission("partners.read")) return <Navigate to="/directory" replace />;
  if (canPermission("installments.read")) return <Navigate to="/dues" replace />;
  if (canPermission("repairs.read") || canPermission("inventory.read")) return <Navigate to="/operations" replace />;
  if (canPermission("sales.read") || canPermission("profits.read")) return <Navigate to="/sales" replace />;
  return <MiniAppDataState empty emptyText="برای این حساب هنوز دسترسی مدیریتی قابل نمایش فعال نشده است." />;
};
