import React, { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  ListChecks,
  Menu,
  MoreHorizontal,
  Package,
  Search,
  ShoppingCart,
  WalletCards,
} from "../../components/lucide-react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";
import { MINIAPP_VISUAL_REFERENCE } from "../reference/miniAppVisualSystem";
import { MINIAPP_PREMIUM } from "../reference/miniAppPremiumDesignSystem";
import { configureTelegramBackButton, getTelegramWebApp } from "../telegram";
import { MiniAppDataAvailabilityStatus } from "./MiniAppDataAvailabilityStatus";

const customerNavigation = [
  { to: "/", label: "خانه", icon: Home },
  { to: "/account", label: "حساب", icon: WalletCards },
  { to: "/installments", label: "اقساط", icon: ListChecks },
  { to: "/purchases", label: "خریدها", icon: ShoppingCart },
] as const;

const partnerNavigation = [
  { to: "/", label: "خانه", icon: Home },
  { to: "/account", label: "حساب", icon: WalletCards },
  { to: "/purchases", label: "کالاها", icon: Package },
  { to: "/more", label: "بیشتر", icon: MoreHorizontal },
] as const;

const staffNavigation = [
  { to: "/", label: "خانه", icon: Home, capability: "staff:executive:read" },
  { to: "/search", label: "جستجو", icon: Search, capability: "staff:executive:read" },
  { to: "/dues", label: "سررسیدها", icon: ListChecks, capability: "staff:installments:read" },
  { to: "/inventory", label: "موجودی", icon: Package, capability: "staff:inventory_lookup:read" },
] as const;

const resolveTitle = (kind: string | undefined, pathname: string): string => {
  if (kind === "partner") {
    if (pathname.startsWith("/ledger")) return "گردش حساب";
    if (pathname.startsWith("/purchases")) return "کالاها";
    if (pathname.startsWith("/phones")) return "تسویه گوشی‌ها";
    if (pathname.startsWith("/account")) return "حساب";
    if (pathname.startsWith("/more")) return "بیشتر";
    return "خانه";
  }
  if (kind === "staff") {
    if (pathname.startsWith("/search") || pathname.startsWith("/customers/")) return "جستجو";
    if (pathname.startsWith("/dues") || pathname.startsWith("/installments/")) return "سررسیدها";
    if (pathname.startsWith("/inventory") || pathname.startsWith("/phones/")) return "موجودی";
    if (pathname.startsWith("/sales")) return "فروش";
    if (pathname.startsWith("/invoices/")) return "فاکتور";
    return "خانه";
  }
  if (pathname.startsWith("/purchases") || pathname.startsWith("/invoices/")) return "خریدها";
  if (pathname.startsWith("/installments")) return "اقساط";
  if (pathname.startsWith("/account")) return "حساب";
  return "خانه";
};

const isPartnerNavActive = (to: string, pathname: string): boolean => {
  if (to === "/") return pathname === "/";
  if (to === "/account") return pathname.startsWith("/account") || pathname.startsWith("/ledger");
  if (to === "/purchases") return pathname.startsWith("/purchases");
  if (to === "/more") return pathname.startsWith("/more") || pathname.startsWith("/phones");
  return pathname.startsWith(to);
};

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
      if (identity?.kind === "partner" && location.pathname === "/phones") { navigate("/more", { replace: true }); return; }
      navigate("/", { replace: true });
    };
    return configureTelegramBackButton(webApp, { isHome, onBack: goBack });
  }, [identity?.kind, location.pathname, navigate]);

  const title = resolveTitle(identity?.kind, location.pathname);

  const partnerMode = identity?.kind === "partner";

  return (
    <div className={partnerMode ? MINIAPP_PREMIUM.shell : "min-h-[var(--tg-viewport-stable-height,100vh)] bg-gradient-to-b from-primary/5 via-background to-background pb-[calc(5.5rem+var(--tg-safe-area-inset-bottom,0px))] pt-[var(--tg-content-safe-area-inset-top,0px)] font-sans text-foreground"}>
      <header className={partnerMode ? MINIAPP_PREMIUM.topBar : MINIAPP_VISUAL_REFERENCE.topBar}>
        <div className={partnerMode ? MINIAPP_PREMIUM.topBarInner : "mx-auto grid h-16 max-w-xl grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3 px-4"}>
          <div className="flex justify-start">
            {partnerMode ? (
              <Link to="/more" className={`${MINIAPP_PREMIUM.roundButton} no-underline`} aria-label="بیشتر">
                <MoreHorizontal size={20} strokeWidth={2.3} className="rotate-90" />
              </Link>
            ) : identity?.kind === "staff" ? (
              <details className="relative">
                <summary className={`${MINIAPP_VISUAL_REFERENCE.circularAction} cursor-pointer list-none`} aria-label="امنیت">
                  <MoreHorizontal size={20} />
                </summary>
                <div className="absolute left-0 top-12 z-40 w-64 rounded-[var(--radius-lg)] border border-border/70 bg-card p-4 text-right shadow-xl">
                  <strong className="block text-xs">هویت سازمانی تأییدشده</strong>
                  <span className="mt-1 block text-[11px] text-mutedText">{identity.roleName === "Admin" ? "مدیر سیستم" : "مدیر"} · اتصال امن تلگرام</span>
                </div>
              </details>
            ) : <span className="size-10" aria-hidden="true" />}
          </div>
          <strong className={partnerMode ? MINIAPP_PREMIUM.title : "truncate text-center text-lg font-black"}>{title}</strong>
          {partnerMode ? (
            <Link to="/more" className={`${MINIAPP_PREMIUM.roundButton} no-underline`} aria-label="منوی همکار">
              <Menu size={20} strokeWidth={2.3} />
            </Link>
          ) : (
            <Link to="/" className={`${MINIAPP_VISUAL_REFERENCE.circularAction} overflow-hidden p-1.5 no-underline`} aria-label="خانه کوروش">
              <img className="size-7 object-contain" src="/kourosh-logo.svg" alt="" aria-hidden="true" />
            </Link>
          )}
        </div>
      </header>

      <main className={partnerMode ? MINIAPP_PREMIUM.content : "mx-auto w-full max-w-xl px-4 py-5"}>
        {!partnerMode ? <MiniAppDataAvailabilityStatus /> : null}
        <Outlet />
      </main>

      <nav className={partnerMode ? MINIAPP_PREMIUM.dock : MINIAPP_VISUAL_REFERENCE.bottomDock} aria-label={identity?.kind === "staff" ? "ناوبری مدیریتی" : partnerMode ? "ناوبری همکار" : "ناوبری مشتری"}>
        <div className="grid grid-cols-4 gap-1">
          {navigation.map(({ to, label, icon: Icon }) => {
            const active = partnerMode
              ? isPartnerNavActive(to, location.pathname)
              : to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={partnerMode
                  ? `${MINIAPP_PREMIUM.navItem} ${active ? MINIAPP_PREMIUM.navActive : MINIAPP_PREMIUM.navInactive}`
                  : `${MINIAPP_VISUAL_REFERENCE.navItem} ${active ? MINIAPP_VISUAL_REFERENCE.navActive : MINIAPP_VISUAL_REFERENCE.navInactive}`}
              >
                <Icon size={partnerMode ? 20 : 20} strokeWidth={partnerMode ? 2.15 : undefined} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
