import React, { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useMiniAppAuth } from "./auth/MiniAppAuthContext";
import { MiniAppShell } from "./components/MiniAppShell";
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
import { StaffHome } from "./pages/StaffHome";
import { StaffSearch } from "./pages/StaffSearch";
import { StaffDues } from "./pages/StaffDues";
import { StaffInventory } from "./pages/StaffInventory";
import { StaffSales } from "./pages/StaffSales";
import { StaffCustomerDetail } from "./pages/StaffCustomerDetail";
import { StaffPhoneDetail } from "./pages/StaffPhoneDetail";
import { StaffInstallmentDetail } from "./pages/StaffInstallmentDetail";
import { StaffInvoiceDetail } from "./pages/StaffInvoiceDetail";
import type { StaffCapability } from "./types";

const FullPageState: React.FC<{
  title: string;
  message: string;
  loading?: boolean;
  retry?: () => void;
}> = ({ title, message, loading, retry }) => (
  <main className="flex min-h-[var(--tg-viewport-stable-height,100vh)] flex-col items-center justify-center gap-3 bg-background px-6 py-10 text-center font-sans text-foreground" aria-busy={loading}>
    <img className="size-20 object-contain" src="/kourosh-logo.svg" alt="کوروش" />
    {loading ? <span className="size-6 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" /> : null}
    <h1 className="m-0 text-xl font-black">{title}</h1>
    <p className="m-0 max-w-sm text-sm leading-7 text-mutedText">{message}</p>
    {retry ? <button type="button" onClick={retry} className="mt-2 min-h-11 rounded-[var(--radius-md)] bg-primary px-5 text-sm font-bold text-primary-foreground">تلاش دوباره</button> : null}
  </main>
);

const resolveBootstrapTitle = (status: string, code: string | null): string => {
  if (status === "unlinked") return "اتصال حساب لازم است";
  if (code === "MINIAPP_OFFLINE_SNAPSHOT_UNAVAILABLE") return "فروشگاه آفلاین است";
  if (code === "MINIAPP_OFFLINE_SNAPSHOT_EXPIRED") return "اطلاعات ذخیره‌شده منقضی شده است";
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
    navigate(launch.route, { replace: true });
  }, [launch, navigate, status]);
  if (status === "loading") return <FullPageState loading title="اتصال امن به کوروش" message={message} />;
  if (status !== "authenticated") {
    return <FullPageState title={resolveBootstrapTitle(status, code)} message={message} retry={status === "outside_telegram" ? undefined : retry} />;
  }
  if (identity?.kind === "staff") {
    const allowed = (capability: StaffCapability) => identity.capabilities.includes(capability);
    return (
      <Routes>
        <Route element={<MiniAppShell />}>
          <Route index element={allowed("staff:executive:read") ? <StaffHome /> : <Navigate to="/" replace />} />
          {allowed("staff:executive:read") ? <Route path="search" element={<StaffSearch />} /> : null}
          {allowed("staff:installments:read") ? <Route path="dues" element={<StaffDues />} /> : null}
          {allowed("staff:inventory_lookup:read") ? <Route path="inventory" element={<StaffInventory />} /> : null}
          {allowed("staff:sales_summary:read") ? <Route path="sales" element={<StaffSales />} /> : null}
          {allowed("staff:customer_lookup:read") ? <Route path="customers/:id" element={<StaffCustomerDetail />} /> : null}
          {allowed("staff:inventory_lookup:read") ? <Route path="phones/:id" element={<StaffPhoneDetail />} /> : null}
          {allowed("staff:installments:read") ? <Route path="installments/:id" element={<StaffInstallmentDetail />} /> : null}
          {allowed("staff:invoice_lookup:read") ? <Route path="invoices/:ref" element={<StaffInvoiceDetail />} /> : null}
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
