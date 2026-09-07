import React from "react";
import { Navigate } from "react-router-dom";
import {
  Bell,
  CircleDollarSign,
  Home,
  ListChecks,
  Package,
  ShieldCheck,
  Store,
  UserCheck,
  WalletCards,
} from "../../components/lucide-react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppMetricCard, MiniAppPill, MiniAppQuickAction, MiniAppSectionHeading } from "../components/MiniAppVisualPrimitives";
import { formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { useMiniAppPermissions } from "../permission/MiniAppPermissionContext";
import { MINIAPP_VISUAL_REFERENCE } from "../reference/miniAppVisualSystem";
import type { ManagerDashboardData } from "../types";

const ManagerDashboard: React.FC = () => {
  const { identity } = useMiniAppAuth();
  const { canPermission } = useMiniAppPermissions();
  const query = useMiniAppQuery<ManagerDashboardData>("/api/miniapp/manager/dashboard");
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const w = query.data.widgets;
  return (
    <div className={MINIAPP_VISUAL_REFERENCE.page}>
      <section className={MINIAPP_VISUAL_REFERENCE.hero}>
        <span className={MINIAPP_VISUAL_REFERENCE.heroGlow} />
        <span className={MINIAPP_VISUAL_REFERENCE.heroGlowSecondary} />
        <div className="relative z-[1]">
          <MiniAppPill tone="success" icon={ShieldCheck}>{identity?.roleName === "Admin" ? "مدیر کل" : "مدیر"} · فضای کاری مدیریت</MiniAppPill>
          <h1 className="mb-0 mt-4 text-2xl font-black">مرکز مدیریت فروشگاه</h1>
          <p className="mb-0 mt-2 text-xs leading-6 text-primary-foreground/80">{identity?.displayName ? `سلام ${identity.displayName}؛ ` : ""}مشتریان، همکاران و شاخص‌های فروشگاه بر اساس سطح دسترسی شما نمایش داده می‌شوند.</p>
        </div>
      </section>

      <section>
        <MiniAppSectionHeading title="امروز" subtitle="شاخص‌های زنده فروشگاه" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {w.sales ? <MiniAppMetricCard label="فروش امروز" value={formatToman(w.sales.todayAmount)} detail={`${w.sales.todayTransactions.toLocaleString("fa-IR")} فروش`} icon={Store} tone="primary" /> : null}
          {w.profit ? <MiniAppMetricCard label="سود امروز" value={formatToman(w.profit.todayGrossProfit)} icon={CircleDollarSign} tone={w.profit.todayGrossProfit < 0 ? "danger" : "success"} /> : null}
          {w.customerReceivables ? <MiniAppMetricCard label="مطالبات مشتریان" value={formatToman(w.customerReceivables.totalReceivables)} detail={`${w.customerReceivables.debtorsCount.toLocaleString("fa-IR")} بدهکار`} icon={UserCheck} tone="warning" /> : null}
          {w.partnerAccounts ? <MiniAppMetricCard label="وضعیت همکاران" value={formatToman(w.partnerAccounts.positiveBalanceAmount)} detail={`${w.partnerAccounts.totalPartners.toLocaleString("fa-IR")} همکار`} icon={Home} tone="info" /> : null}
          {w.installments ? <MiniAppMetricCard label="اقساط معوق" value={formatToman(w.installments.overdueAmount)} detail={`${w.installments.overdueCount.toLocaleString("fa-IR")} مورد`} icon={ListChecks} tone={w.installments.overdueCount ? "danger" : "success"} /> : null}
          {w.installments ? <MiniAppMetricCard label="سررسید امروز" value={formatToman(w.installments.dueTodayAmount)} detail={`${w.installments.dueTodayCount.toLocaleString("fa-IR")} مورد`} icon={ListChecks} tone={w.installments.dueTodayCount ? "warning" : "success"} /> : null}
          {w.installments ? <MiniAppMetricCard label="۷ روز آینده" value={formatToman(w.installments.next7Amount)} detail={`${w.installments.next7Count.toLocaleString("fa-IR")} مورد`} icon={ListChecks} tone="info" /> : null}
          {w.inventory ? <MiniAppMetricCard label="اقلام فعال" value={w.inventory.activeItemsCount.toLocaleString("fa-IR")} icon={Package} tone="info" /> : null}
        </div>
      </section>

      {w.repairs ? (
        <section>
          <MiniAppSectionHeading title="تعمیرات مهم" actionLabel="مشاهده" actionTo="/operations?tab=repairs" />
          <div className={`${MINIAPP_VISUAL_REFERENCE.card} mt-3 p-4`}>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div><strong className="block text-lg font-black">{w.repairs.openCount.toLocaleString("fa-IR")}</strong><span className="text-mutedText">باز</span></div>
              <div><strong className="block text-lg font-black text-success">{w.repairs.readyForPickupCount.toLocaleString("fa-IR")}</strong><span className="text-mutedText">آماده تحویل</span></div>
              <div><strong className="block text-lg font-black text-warning">{w.repairs.waitingPartCount.toLocaleString("fa-IR")}</strong><span className="text-mutedText">منتظر قطعه</span></div>
            </div>
            {w.repairs.oldestOpen ? <p className="mb-0 mt-4 border-t border-border/60 pt-3 text-xs leading-6 text-mutedText">قدیمی‌ترین: <strong className="text-foreground">{w.repairs.oldestOpen.customerName} · {w.repairs.oldestOpen.deviceModel}</strong>، {w.repairs.oldestOpen.ageDays.toLocaleString("fa-IR")} روز</p> : null}
          </div>
        </section>
      ) : null}

      <section>
        <MiniAppSectionHeading title="دسترسی سریع" subtitle="حساب‌ها و عملیات مدیریتی" />
        <div className="mt-3 grid grid-cols-2 gap-3">
          {canPermission("customers.read") ? <MiniAppQuickAction to="/directory?type=customer" title="مشتریان" subtitle={canPermission("customers.ledger.read") ? "مانده، خریدها، اقساط و دفتر حساب" : "جستجو، مانده و خریدهای مشتری"} icon={UserCheck} /> : null}
          {canPermission("partners.read") ? <MiniAppQuickAction to="/directory?type=partner" title="همکاران" subtitle={canPermission("partners.ledger.read") ? "مانده، تأمین، تسویه و دفتر حساب" : "جستجو، مانده و تأمین همکار"} icon={WalletCards} tone="info" /> : null}
          {canPermission("installments.read") ? <MiniAppQuickAction to="/dues" title="سررسیدها" subtitle="معوق، امروز و ۷ روز آینده" icon={ListChecks} tone="warning" /> : null}
          {canPermission("sales.read") ? <MiniAppQuickAction to="/sales" title="فروش و گزارش" subtitle="فروش دوره‌ای و شاخص‌های مجاز" icon={CircleDollarSign} tone="success" /> : null}
          {(canPermission("repairs.read") || canPermission("inventory.read")) ? <MiniAppQuickAction to="/operations" title="عملیات فروشگاه" subtitle="تعمیرات و موجودی" icon={Package} tone="info" /> : null}
          <MiniAppQuickAction to="/notifications" title="اعلان‌های مدیریت" subtitle="Inbox شخصی این مدیر" icon={Bell} tone="info" />
        </div>
      </section>
    </div>
  );
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
