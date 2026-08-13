import React, { useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CircleDollarSign,
  ListChecks,
  Search,
  ShoppingCart,
  UserCheck,
} from "../../components/lucide-react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";
import { getTelegramWebApp } from "../telegram";

const customerNavigation = [
  { to: "/", label: "خانه", icon: UserCheck, end: true },
  { to: "/purchases", label: "خریدها", icon: ShoppingCart, end: false },
  { to: "/installments", label: "اقساط", icon: ListChecks, end: false },
  { to: "/account", label: "حساب", icon: CircleDollarSign, end: false },
] as const;

const partnerNavigation = [
  { to: "/", label: "خانه", icon: UserCheck, end: true },
  { to: "/ledger", label: "گردش حساب", icon: ListChecks, end: false },
  { to: "/purchases", label: "کالاها", icon: ShoppingCart, end: false },
  { to: "/account", label: "حساب", icon: CircleDollarSign, end: false },
] as const;

const staffNavigation = [
  { to: "/", label: "خانه", icon: UserCheck, end: true, capability: "staff:executive:read" },
  { to: "/search", label: "جستجو", icon: Search, end: false, capability: "staff:executive:read" },
  { to: "/dues", label: "سررسیدها", icon: ListChecks, end: false, capability: "staff:installments:read" },
  { to: "/inventory", label: "موجودی", icon: ShoppingCart, end: false, capability: "staff:inventory_lookup:read" },
] as const;

export const MiniAppShell: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { identity } = useMiniAppAuth();
  const navigation = identity?.kind === "staff"
    ? staffNavigation.filter((item) => identity.capabilities.includes(item.capability))
    : identity?.kind === "partner"
      ? partnerNavigation
      : customerNavigation;

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return;
    const isHome = location.pathname === "/";
    const goBack = () => {
      if (/^\/installments\/[^/]+$/.test(location.pathname)) {
        navigate("/installments", { replace: true });
        return;
      }
      if (/^\/invoices\/[^/]+$/.test(location.pathname)) {
        navigate(identity?.kind === "staff" ? "/search" : "/purchases", { replace: true });
        return;
      }
      if (identity?.kind === "staff" && /^\/customers\/[^/]+$/.test(location.pathname)) { navigate("/search", { replace: true }); return; }
      if (identity?.kind === "staff" && /^\/phones\/[^/]+$/.test(location.pathname)) { navigate("/inventory", { replace: true }); return; }
      navigate("/", { replace: true });
    };
    if (isHome) webApp.BackButton.hide();
    else {
      webApp.BackButton.show();
      webApp.BackButton.onClick(goBack);
    }
    return () => webApp.BackButton.offClick(goBack);
  }, [identity?.kind, location.pathname, navigate]);

  return (
    <div className="min-h-[var(--tg-viewport-stable-height,100vh)] bg-background pb-[calc(4.75rem+var(--tg-safe-area-inset-bottom,0px))] pt-[var(--tg-content-safe-area-inset-top,0px)] font-sans text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-[var(--tg-theme-bg-color,#fff)]">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-2.5 px-4">
          <img className="size-9 shrink-0 object-contain" src="/kourosh-logo.svg" alt="" aria-hidden="true" />
          <div className="min-w-0 flex-1 leading-5">
            <strong className="block truncate text-sm font-extrabold">کوروش</strong>
            <span className="block truncate text-[11px] text-mutedText">{identity?.displayName}</span>
          </div>
          {identity?.kind === "staff" ? <details className="relative shrink-0 text-left"><summary className="cursor-pointer list-none rounded-[var(--radius-md)] border border-border px-2 py-1 text-[10px] font-bold text-primary">امنیت</summary><div className="absolute left-0 top-9 z-30 w-64 rounded-[var(--radius-md)] border border-border bg-card p-3 text-right shadow-lg"><strong className="block text-xs">هویت سازمانی تأییدشده</strong><span className="mt-1 block text-[11px] text-mutedText">{identity.roleName === "Admin" ? "مدیر سیستم" : "مدیر"} · اتصال امن تلگرام</span><span className="mt-2 block text-[10px] leading-5 text-mutedText">مجوزها در هر درخواست از پایگاه‌داده دوباره بررسی می‌شوند.</span></div></details> : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-xl px-4 py-5">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-[var(--tg-theme-bg-color,#fff)] pb-[max(0.5rem,var(--tg-safe-area-inset-bottom,0px))] pt-2" aria-label={identity?.kind === "staff" ? "ناوبری مدیریتی" : identity?.kind === "partner" ? "ناوبری همکار" : "ناوبری مشتری"}>
        <div className="mx-auto grid max-w-xl grid-cols-4 px-2">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => [
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] text-[10px] font-bold no-underline",
                isActive ? "text-primary" : "text-mutedText",
              ].join(" ")}
            >
              <Icon size={21} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
