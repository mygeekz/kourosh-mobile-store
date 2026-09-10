import React, { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowRight } from "../../components/lucide-react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";
import { configureTelegramBackButton, getTelegramWebApp } from "../telegram";
import { getMiniAppDestinations, resolveMiniAppDestination } from "../navigation/miniAppNavigation";
import { useMiniAppNavigationHistory } from "../navigation/useMiniAppNavigationHistory";
import { MiniAppDataAvailabilityStatus } from "./MiniAppDataAvailabilityStatus";
import { MiniAppWorkspacePicker } from "./MiniAppWorkspacePicker";

export const MiniAppShell: React.FC = () => {
  const location = useLocation();
  const { identity, message } = useMiniAppAuth();
  const destination = identity ? resolveMiniAppDestination(identity, location.pathname) : undefined;
  const goBack = useMiniAppNavigationHistory(`${identity?.kind}:${identity?.subjectId}`, destination?.backTo || "/");
  const isHome = location.pathname === "/";

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp) return;
    return configureTelegramBackButton(webApp, { isHome, onBack: goBack });
  }, [goBack, isHome]);

  if (!identity) return null;
  const navigation = getMiniAppDestinations(identity).filter(item => item.placement === "dock");
  return <div className="miniapp-screen miniapp-shell">
    <a className="miniapp-skip-link" href="#miniapp-content" onClick={event => { event.preventDefault(); document.getElementById("miniapp-content")?.focus(); }}>رفتن به محتوای صفحه</a>
    <header className="miniapp-shell-header">
      <div className="miniapp-shell-header-inner miniapp-safe-inline">
        {isHome ? <span className="miniapp-shell-brand" aria-hidden="true"><img src="/kourosh-logo.svg" alt="" /></span> : <button type="button" className="miniapp-shell-icon" onClick={goBack} aria-label="بازگشت"><ArrowRight size={22} aria-hidden="true" /></button>}
        <div className="miniapp-shell-heading"><MiniAppWorkspacePicker /><strong className="miniapp-shell-title">{destination?.label || "کوروش"}</strong></div>
      </div>
    </header>
    <main id="miniapp-content" tabIndex={-1} className="miniapp-shell-content miniapp-safe-inline">
      {message ? <p className="miniapp-card p-4 text-sm text-danger" role="alert">{message}</p> : null}
      {identity.kind !== "partner" ? <MiniAppDataAvailabilityStatus /> : null}
      <Outlet />
    </main>
    <nav className="miniapp-shell-dock miniapp-safe-inline" aria-label={identity.kind === "staff" ? "ناوبری مدیریتی" : identity.kind === "partner" ? "ناوبری همکار" : "ناوبری مشتری"}>
      <div className="miniapp-shell-nav" style={{ gridTemplateColumns: `repeat(${navigation.length}, minmax(0, 1fr))` }}>
        {navigation.map(({ id, route, label, icon: Icon }) => <Link key={id} to={route} className="miniapp-shell-nav-item" aria-current={destination?.parentSection === id ? "page" : undefined}>
          <Icon size={22} aria-hidden="true" /><span>{label}</span>
        </Link>)}
      </div>
    </nav>
  </div>;
};
