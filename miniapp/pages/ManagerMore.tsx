import React from "react";
import { MiniAppPageHeading, MiniAppArtwork } from "../components/MiniAppArtwork";
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
    <MiniAppPageHeading className="manager-header" id="manager-more-title" title="بیشتر" context="ابزارهای مدیریت" description="پیگیری‌های فروشگاه" artwork="accounts" />
    <ul className="miniapp-more-list">{destinations.map(({ id, route, label, description }) => <li key={id}>
      <Link to={route} className="miniapp-more-link"><span className="miniapp-more-icon"><MiniAppArtwork kind={id === "dues" ? "calendar" : "receipt"} /></span><span className="miniapp-more-copy"><strong>{label}</strong><small>{description}</small></span><ChevronLeft size={20} aria-hidden="true" /></Link>
    </li>)}</ul>
  </section>;
};
