import React, { useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  ListChecks,
  Menu,
  MoreHorizontal,
  Package,
  ShoppingCart,
  Store,
  UserCheck,
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

const managerNavigation = [
  { to: "/", label: "خانه", icon: Home, permissions: ["dashboard.read"] },
  { to: "/directory", label: "اشخاص", icon: UserCheck, permissions: ["customers.read", "partners.read"] },
  { to: "/dues", label: "سررسیدها", icon: ListChecks, permissions: ["installments.read"] },
  { to: "/operations", label: "عملیات", icon: Package, permissions: ["repairs.read", "inventory.read"] },
  { to: "/sales", label: "فروش", icon: Store, permissions: ["sales.read", "profits.read"] },
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
    if (pathname.startsWith("/notifications")) return "اعلان‌های مدیریت";
    if (pathname.startsWith("/directory") || pathname.startsWith("/customers/") || pathname.startsWith("/partners/")) return "مشتری و همکار";
    if (pathname.startsWith("/dues") || pathname.startsWith("/installments/")) return "سررسیدها";
    if (pathname.startsWith("/operations")) return "عملیات";
    if (pathname.startsWith("/sales")) return "فروش";
    return "مدیریت فروشگاه";
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
  const { identity, switchWorkspace } = useMiniAppAuth();
  const navigation = identity?.kind === "staff"
    ? managerNavigation.filter((item) => item.permissions.some((permission) => (identity.permissions || []).includes(permission)))
    : identity?.kind === "partner"
      ? partnerNavigation
      : customerNavigation;

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return;
    const isHome = location.pathname === "/";
    const goBack = () => {
      if (/^\/installments\/[^/]+$/.test(location.pathname)) {
        navigate(identity?.kind === "staff" ? "/dues" : "/installments", { replace: true });
        return;
      }
      if (/^\/invoices\/[^/]+$/.test(location.pathname)) {
        navigate(identity?.kind === "staff" ? "/directory" : "/purchases", { replace: true });
        return;
      }
      if (identity?.kind === "staff" && (/^\/customers\/[^/]+$/.test(location.pathname) || /^\/partners\/[^/]+$/.test(location.pathname))) { navigate("/directory", { replace: true }); return; }
      if (identity?.kind === "partner" && location.pathname === "/phones") { navigate("/more", { replace: true }); return; }
      navigate("/", { replace: true });
    };
    return configureTelegramBackButton(webApp, { isHome, onBack: goBack });
  }, [identity?.kind, location.pathname, navigate]);

  const title = resolveTitle(identity?.kind, location.pathname);

  const partnerMode = identity?.kind === "partner";
  const activeWorkspace = identity?.kind === "staff" ? "manager" : identity?.kind;
  const workspaces = identity?.workspaces || [];
  const workspaceLabel = (kind: string) => kind === "manager" ? "مدیریت فروشگاه" : kind === "partner" ? "حساب همکار من" : "حساب مشتری من";
  const switchTo = (kind: "manager" | "partner" | "customer") => {
    if (kind === activeWorkspace) return;
    void switchWorkspace(kind).then((ok) => { if (ok) navigate("/", { replace: true }); });
  };

  return (
    <div className={partnerMode ? MINIAPP_PREMIUM.shell : "miniapp-screen bg-gradient-to-b from-primary/5 via-background to-background pb-[calc(5.5rem+var(--miniapp-safe-area-bottom))] pt-[var(--miniapp-safe-area-top)] font-sans text-foreground"}>
      <header className={partnerMode ? MINIAPP_PREMIUM.topBar : MINIAPP_VISUAL_REFERENCE.topBar}>
        <div className={partnerMode ? MINIAPP_PREMIUM.topBarInner : "miniapp-safe-inline mx-auto grid h-16 max-w-xl grid-cols-[2.5rem_1fr_2.5rem] items-center gap-3 px-4"}>
          <div className="flex justify-start">
            {partnerMode && workspaces.length <= 1 ? (
              <Link to="/more" className={`${MINIAPP_PREMIUM.roundButton} no-underline`} aria-label="بیشتر">
                <MoreHorizontal size={20} strokeWidth={2.3} className="rotate-90" />
              </Link>
            ) : identity?.kind === "staff" || workspaces.length > 1 ? (
              <details className="relative">
                <summary className={`${MINIAPP_VISUAL_REFERENCE.circularAction} cursor-pointer list-none`} aria-label="تغییر فضای کاری">
                  <MoreHorizontal size={20} />
                </summary>
                <div className="absolute end-0 top-12 z-40 w-64 rounded-[var(--radius-lg)] border border-border/70 bg-card p-3 text-start shadow-xl">
                  <strong className="block px-2 pb-2 text-xs">فضای کاری</strong>
                  <div className="space-y-1">{workspaces.map((workspace) => <button key={`${workspace.kind}-${workspace.subjectId}`} type="button" onClick={() => switchTo(workspace.kind)} className={`flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-md)] px-3 text-start text-xs font-bold ${workspace.kind === activeWorkspace ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}>{workspace.kind === "manager" ? <Store size={17}/> : <WalletCards size={17}/>}<span className="min-w-0 flex-1 truncate">{workspaceLabel(workspace.kind)}</span>{workspace.kind === activeWorkspace ? <span className="text-[10px]">فعال</span> : null}</button>)}</div>
                  {identity?.kind === "staff" ? <span className="mt-2 block border-t border-border/60 px-2 pt-2 text-[10px] text-mutedText">{identity.roleName === "Admin" ? "مدیر سیستم" : "مدیر"} · اتصال امن تلگرام</span> : null}
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

      <main className={partnerMode ? MINIAPP_PREMIUM.content : "miniapp-safe-inline mx-auto w-full max-w-xl px-4 py-5"}>
        {!partnerMode ? <MiniAppDataAvailabilityStatus /> : null}
        <Outlet />
      </main>

      <nav className={partnerMode ? MINIAPP_PREMIUM.dock : MINIAPP_VISUAL_REFERENCE.bottomDock} aria-label={identity?.kind === "staff" ? "ناوبری مدیریتی" : partnerMode ? "ناوبری همکار" : "ناوبری مشتری"}>
        <div className={`miniapp-safe-inline grid gap-1 ${navigation.length <= 2 ? "grid-cols-2" : navigation.length === 3 ? "grid-cols-3" : navigation.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
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
