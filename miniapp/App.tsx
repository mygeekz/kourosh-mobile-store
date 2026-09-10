import React, { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useMiniAppAuth } from "./auth/MiniAppAuthContext";
import { MiniAppShell } from "./components/MiniAppShell";
import { getMiniAppHomeRoute } from "./navigation/miniAppNavigation";
import { CustomerAccount } from "./pages/CustomerAccount";
import { CustomerHome } from "./pages/CustomerHome";
import { CustomerInstallmentDetailPage } from "./pages/CustomerInstallmentDetail";
import { CustomerInstallments } from "./pages/CustomerInstallments";
import { CustomerInvoice } from "./pages/CustomerInvoice";
import { CustomerPurchases } from "./pages/CustomerPurchases";
import { PartnerAccount } from "./pages/PartnerAccount";
import { PartnerHome } from "./pages/PartnerHome";
import { PartnerLedger } from "./pages/PartnerLedger";
import { PartnerMore } from "./pages/PartnerMore";
import { PartnerPhones } from "./pages/PartnerPhones";
import { PartnerPurchases } from "./pages/PartnerPurchases";
import { ManagerHome } from "./pages/ManagerHome";
import { ManagerMore } from "./pages/ManagerMore";
import { ManagerDirectory } from "./pages/ManagerDirectory";
import { ManagerCustomerDetail } from "./pages/ManagerCustomerDetail";
import { ManagerPartnerDetail } from "./pages/ManagerPartnerDetail";
import { ManagerDues } from "./pages/ManagerDues";
import { ManagerOperations } from "./pages/ManagerOperations";
import { ManagerSales } from "./pages/ManagerSales";
import { ManagerInstallmentDetail } from "./pages/ManagerInstallmentDetail";
import { ManagerNotifications } from "./pages/ManagerNotifications";

const FullPageState: React.FC<{
  title: string;
  message: string;
  loading?: boolean;
  retry?: () => void;
}> = ({ title, message, loading, retry }) => (
  <main className="miniapp-screen miniapp-safe-page flex flex-col items-center justify-center gap-3 bg-background text-center font-sans text-foreground" aria-busy={loading}>
    <img className="size-20 object-contain" src="/kourosh-logo.svg" alt="کوروش" />
    {loading ? <span className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" /> : null}
    <h1 className="m-0 text-xl font-black">{title}</h1>
    <p className="m-0 max-w-sm text-sm leading-7 text-mutedText">{message}</p>
    {retry ? <button type="button" onClick={retry} className="mt-2 min-h-11 rounded-[var(--radius-md)] bg-primary px-5 text-sm font-bold text-primary-foreground">تلاش دوباره</button> : null}
  </main>
);

const resolveBootstrapTitle = (status: string, code: string | null): string => {
  if (status === "unlinked") return "اتصال حساب لازم است";
  if (code === "MINIAPP_STAFF_OFFLINE_UNAVAILABLE") return "اتصال زنده فروشگاه برقرار نیست";
  if (code === "MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE") return "فروشگاه آفلاین است";
  if (code === "MINIAPP_OFFLINE_SNAPSHOT_EXPIRED") return "اطلاعات ذخیره‌شده منقضی شده است";
  if (code === "MINIAPP_EDGE_SCHEMA_MIGRATION_REQUIRED") return "به‌روزرسانی فضای ابری لازم است";
  if (code === "MINIAPP_EDGE_STORAGE_UNAVAILABLE") return "دسترسی آفلاین آماده نیست";
  return "ورود انجام نشد";
};

const MiniAppRoutes: React.FC = () => {
  const { status, identity, launch, message, code, retry } = useMiniAppAuth();
  const navigate = useNavigate();
  const consumedLaunch = useRef(false);
  useEffect(() => {
    if (status !== "authenticated" || consumedLaunch.current || !launch) return;
    consumedLaunch.current = true;
    navigate(launch.route === "/" && identity ? getMiniAppHomeRoute(identity) : launch.route, { replace: true });
  }, [identity, launch, navigate, status]);
  if (status === "loading" || status === "syncing") return <FullPageState loading title={status === "syncing" ? "همگام‌سازی حساب" : "اتصال امن به کوروش"} message={message} />;
  if (status !== "authenticated") {
    return <FullPageState title={resolveBootstrapTitle(status, code)} message={message} retry={status === "outside_telegram" ? undefined : retry} />;
  }
  if (identity?.kind === "staff") {
    const permissions = new Set(identity.permissions || []);
    const can = (permission: string) => permissions.has(permission);
    const homeRoute = getMiniAppHomeRoute(identity);
    return (
      <Routes>
        <Route element={<MiniAppShell />}>
          <Route index element={homeRoute === "/" ? <ManagerHome /> : <Navigate to={homeRoute} replace />} />
          <Route path="more" element={<ManagerMore />} />
          <Route path="notifications" element={<ManagerNotifications />} />
          {(can("customers.read") || can("partners.read")) ? <Route path="directory" element={<ManagerDirectory />} /> : null}
          {can("customers.read") ? <Route path="customers/:id" element={<ManagerCustomerDetail />} /> : null}
          {can("partners.read") ? <Route path="partners/:id" element={<ManagerPartnerDetail />} /> : null}
          {can("installments.read") ? <Route path="dues" element={<ManagerDues />} /> : null}
          {can("installments.read") ? <Route path="installments/:id" element={<ManagerInstallmentDetail />} /> : null}
          {(can("repairs.read") || can("inventory.read")) ? <Route path="operations" element={<ManagerOperations />} /> : null}
          {(can("sales.read") || can("profits.read")) ? <Route path="sales" element={<ManagerSales />} /> : null}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    );
  }
  if (identity?.kind === "partner") return (
    <Routes>
      <Route element={<MiniAppShell />}>
        <Route index element={<PartnerHome />} />
        <Route path="ledger" element={<PartnerLedger />} />
        <Route path="purchases" element={<PartnerPurchases />} />
        <Route path="phones" element={<PartnerPhones />} />
        <Route path="account" element={<PartnerAccount />} />
        <Route path="more" element={<PartnerMore />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
  if (identity?.kind !== "customer") return <FullPageState title="دسترسی معتبر نیست" message="نوع حساب Mini App قابل شناسایی نیست." />;
  return (
    <Routes>
      <Route element={<MiniAppShell />}>
        <Route index element={<CustomerHome />} />
        <Route path="purchases" element={<CustomerPurchases />} />
        <Route path="installments" element={<CustomerInstallments />} />
        <Route path="installments/:saleId" element={<CustomerInstallmentDetailPage />} />
        <Route path="account" element={<CustomerAccount />} />
        <Route path="invoices/:invoiceRef" element={<CustomerInvoice />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export default MiniAppRoutes;
