import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "../../components/lucide-react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";
import { getMiniAppDestinations } from "../navigation/miniAppNavigation";
import { MINIAPP_VISUAL_REFERENCE } from "../reference/miniAppVisualSystem";

export const ManagerMore: React.FC = () => {
  const { identity } = useMiniAppAuth();
  if (!identity || identity.kind !== "staff") return null;
  const destinations = getMiniAppDestinations(identity).filter(item => item.placement === "more");
  return <section className={MINIAPP_VISUAL_REFERENCE.page} aria-labelledby="manager-more-title">
    <header><h1 id="manager-more-title" className={MINIAPP_VISUAL_REFERENCE.pageTitle}>بیشتر</h1><p className={MINIAPP_VISUAL_REFERENCE.pageSubtitle}>پیگیری‌های فروشگاه</p></header>
    <ul className="miniapp-more-list">{destinations.map(({ id, route, label, description, icon: Icon }) => <li key={id}>
      <Link to={route} className="miniapp-more-link"><span className="miniapp-more-icon"><Icon size={22} aria-hidden="true" /></span><span className="miniapp-more-copy"><strong>{label}</strong><small>{description}</small></span><ChevronLeft size={20} aria-hidden="true" /></Link>
    </li>)}</ul>
  </section>;
};
