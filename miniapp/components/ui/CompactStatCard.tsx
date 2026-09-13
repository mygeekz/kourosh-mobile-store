import React from "react";
import type { LucideIcon } from "lucide-react";
import { MiniAppCard } from "./MiniAppFoundation";

/** Layout only. Values, availability and financial formatting remain with callers. */
export const CompactStatCard: React.FC<React.PropsWithChildren<{
  label: string;
  icon: LucideIcon;
  className?: string;
  detail?: React.ReactNode;
}>> = ({ label, icon: Icon, className = "", detail, children }) => (
  <MiniAppCard className={`miniapp-compact-stat ${className}`}>
    <div className="miniapp-stat-heading">
      <span className="miniapp-stat-icon" aria-hidden="true"><Icon size={18} /></span>
      <span className="miniapp-stat-label">{label}</span>
    </div>
    <div className="miniapp-stat-value">{children}</div>
    {detail && <small className="miniapp-stat-meta">{detail}</small>}
  </MiniAppCard>
);
