import React from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "../../components/lucide-react";
import {
  MINIAPP_VISUAL_REFERENCE,
  MINIAPP_VISUAL_TONE,
  type MiniAppVisualTone,
} from "../reference/miniAppVisualSystem";

export const MiniAppIconTile: React.FC<{
  icon: LucideIcon;
  tone?: MiniAppVisualTone;
  size?: "sm" | "md" | "lg";
}> = ({ icon: Icon, tone = "primary", size = "md" }) => {
  const sizeClass = size === "sm" ? "size-9" : size === "lg" ? "size-14" : "size-11";
  const iconSize = size === "sm" ? 17 : size === "lg" ? 25 : 20;
  return (
    <span className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-[var(--radius-md)] border shadow-sm ${MINIAPP_VISUAL_TONE[tone].icon}`} aria-hidden="true">
      <Icon size={iconSize} />
    </span>
  );
};

export const MiniAppPill: React.FC<React.PropsWithChildren<{
  tone?: MiniAppVisualTone;
  icon?: LucideIcon;
  className?: string;
}>> = ({ tone = "muted", icon: Icon, className = "", children }) => (
  <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-extrabold ${MINIAPP_VISUAL_TONE[tone].pill} ${className}`}>
    {Icon ? <Icon size={14} aria-hidden="true" /> : null}
    {children}
  </span>
);

export const MiniAppSectionHeading: React.FC<{
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionTo?: string;
}> = ({ title, subtitle, actionLabel, actionTo }) => (
  <div className="flex items-end justify-between gap-3">
    <div className="min-w-0">
      <h2 className={MINIAPP_VISUAL_REFERENCE.sectionTitle}>{title}</h2>
      {subtitle ? <p className={MINIAPP_VISUAL_REFERENCE.sectionSubtitle}>{subtitle}</p> : null}
    </div>
    {actionLabel && actionTo ? <Link to={actionTo} className="shrink-0 text-xs font-extrabold text-primary no-underline">{actionLabel}</Link> : null}
  </div>
);

export const MiniAppMetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon: LucideIcon;
  tone?: MiniAppVisualTone;
}> = ({ label, value, detail, icon, tone = "primary" }) => (
  <div className={`${MINIAPP_VISUAL_REFERENCE.card} min-w-0 p-3`}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <span className={MINIAPP_VISUAL_REFERENCE.label}>{label}</span>
        <strong className="mt-1 block truncate text-base font-black tabular-nums text-foreground">{value}</strong>
        {detail ? <span className="mt-1 block text-[10px] leading-5 text-mutedText">{detail}</span> : null}
      </div>
      <MiniAppIconTile icon={icon} tone={tone} size="sm" />
    </div>
  </div>
);

export const MiniAppQuickAction: React.FC<{
  to: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone?: MiniAppVisualTone;
}> = ({ to, title, subtitle, icon, tone = "primary" }) => (
  <Link to={to} className={`${MINIAPP_VISUAL_REFERENCE.cardInteractive} flex min-h-24 items-center gap-3 p-3 text-foreground no-underline`}>
    <MiniAppIconTile icon={icon} tone={tone} size="lg" />
    <span className="min-w-0">
      <strong className="block text-sm font-black leading-6">{title}</strong>
      <span className="mt-0.5 block text-[11px] leading-5 text-mutedText">{subtitle}</span>
    </span>
  </Link>
);

export const MiniAppFilterChip: React.FC<React.PropsWithChildren<{
  active?: boolean;
  tone?: MiniAppVisualTone;
  onClick?: () => void;
}>> = ({ active = false, tone = "primary", onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${MINIAPP_VISUAL_REFERENCE.filterChip} ${active ? `${MINIAPP_VISUAL_TONE[tone].pill} shadow-sm` : "border-border/70 bg-card text-mutedText"}`}
  >
    {children}
  </button>
);
