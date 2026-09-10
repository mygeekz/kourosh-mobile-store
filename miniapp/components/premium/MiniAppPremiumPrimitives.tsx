import React from "react";
import { Link } from "react-router-dom";
import { MiniAppCard, MiniAppFinancialValue } from "../ui/MiniAppFoundation";
import type { LucideIcon } from "../../../components/lucide-react";
import { Clock3, Store } from "../../../components/lucide-react";
import {
  MINIAPP_PREMIUM,
  MINIAPP_PREMIUM_TONE,
  type MiniAppPremiumTone,
} from "../../reference/miniAppPremiumDesignSystem";

export const PremiumIconTile: React.FC<{
  icon: LucideIcon;
  tone?: MiniAppPremiumTone;
  size?: "sm" | "md" | "lg" | "xl";
  solid?: boolean;
}> = ({ icon: Icon, tone = "blue", size = "md", solid = true }) => {
  const sizeClass = size === "sm" ? "size-10 rounded-[1rem]" : size === "lg" ? "size-[4.2rem] rounded-[1.35rem]" : size === "xl" ? "size-[5rem] rounded-[1.55rem]" : "size-12 rounded-[1.15rem]";
  const iconSize = size === "sm" ? 18 : size === "lg" ? 27 : size === "xl" ? 32 : 21;
  const toneClass = solid ? MINIAPP_PREMIUM_TONE[tone].icon : MINIAPP_PREMIUM_TONE[tone].pill;
  return (
    <span className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden border ${toneClass}`} aria-hidden="true">
      {solid ? <span className="absolute inset-x-2 top-1 h-px bg-white/60" /> : null}
      <Icon size={iconSize} strokeWidth={2.1} className="relative z-[1]" />
    </span>
  );
};

export const PremiumPill: React.FC<React.PropsWithChildren<{
  tone?: MiniAppPremiumTone;
  icon?: LucideIcon;
  className?: string;
  compact?: boolean;
}>> = ({ tone = "slate", icon: Icon, className = "", compact = false, children }) => (
  <span className={`miniapp-badge inline-flex items-center rounded-full border py-1 ${compact ? "min-h-7 gap-1.5 px-2.5" : "min-h-8 gap-1.5 px-3"} ${MINIAPP_PREMIUM_TONE[tone].pill} ${className}`}>
    {Icon ? <Icon size={compact ? 11 : 14} strokeWidth={2.2} aria-hidden="true" /> : null}
    {children}
  </span>
);

export const PremiumStoreAvatar: React.FC<{ size?: "md" | "lg" }> = ({ size = "lg" }) => (
  <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white bg-white shadow-premium-float ${size === "lg" ? "size-[4.5rem]" : "size-[3.6rem]"}`}>
    <img src="/miniapp/premium/store-avatar.webp" alt="" className="size-full object-cover" aria-hidden="true" />
  </span>
);

export const PremiumSectionHeading: React.FC<{
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionTo?: string;
}> = ({ title, subtitle, actionLabel, actionTo }) => (
  <div className="miniapp-section-heading">
    <div className="min-w-0">
      <h2 className={MINIAPP_PREMIUM.sectionTitle}>{title}</h2>
      {subtitle ? <p className={MINIAPP_PREMIUM.sectionSubtitle}>{subtitle}</p> : null}
    </div>
    {actionLabel && actionTo ? (
      <Link to={actionTo} className="miniapp-section-action shrink-0 font-bold text-premium-blue no-underline">
        {actionLabel}
      </Link>
    ) : null}
  </div>
);

export const PremiumHeroBalance: React.FC<{
  title?: string;
  amount: React.ReactNode;
  status: string;
  statusTone?: MiniAppPremiumTone;
  updatedLabel?: React.ReactNode;
  artwork?: boolean;
  backgroundImageSrc?: string;
}> = ({ title = "مانده حساب", amount, status, statusTone = "mint", updatedLabel, artwork = true, backgroundImageSrc }) => {
  return (
    <section className={MINIAPP_PREMIUM.hero} aria-label={title}>
      {backgroundImageSrc ? (
        <img src={backgroundImageSrc} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10" />
      ) : artwork ? (
        <img src="/miniapp/premium/wallet-hero.webp" alt="" aria-hidden="true" className="pointer-events-none absolute bottom-2 left-2 h-28 w-28 object-contain opacity-10" />
      ) : null}
      <div className="relative z-10 flex min-h-[10.75rem] flex-col gap-4 p-5">
        <span className="text-sm font-medium text-white">{title}</span>
        <MiniAppFinancialValue className="text-[clamp(1.5rem,6vw,2rem)] font-bold text-white">{amount}</MiniAppFinancialValue>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-3">
          <PremiumPill tone={statusTone}>{status}</PremiumPill>
          {updatedLabel ? <span className="flex flex-wrap items-center gap-1.5 text-xs text-white"><Clock3 size={14} aria-hidden="true" />{updatedLabel}</span> : null}
        </div>
      </div>
    </section>
  );
};

export const PremiumQuickAction: React.FC<{
  to: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone?: MiniAppPremiumTone;
  compact?: boolean;
}> = ({ to, title, subtitle, icon, tone = "blue", compact = false }) => (
  <Link to={to} className={`${MINIAPP_PREMIUM.cardInteractive} flex flex-wrap ${compact ? "min-h-[4.55rem] gap-2.5 p-3" : "min-h-[5.75rem] gap-3 p-4"} text-premium-ink no-underline`}>
    <PremiumIconTile icon={icon} tone={tone} size={compact ? "md" : "lg"} />
    <span className="min-w-0 flex-1 self-center">
      <strong className={`block font-black text-premium-navy ${compact ? "text-[13px] leading-5" : "text-[15px] leading-7"}`}>{title}</strong>
      <span className="miniapp-caption mt-1 block text-premium-muted">{subtitle}</span>
    </span>
  </Link>
);

export const PremiumMetricCard: React.FC<{
  label: string;
  value: React.ReactNode;
  detail?: React.ReactNode;
  icon: LucideIcon;
  tone?: MiniAppPremiumTone;
}> = ({ label, value, detail, icon, tone = "blue" }) => (
  <MiniAppCard className="miniapp-metric-card p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <span className="block text-xs font-medium leading-6 text-premium-muted">{label}</span>
      </div>
      <PremiumIconTile icon={icon} tone={tone} size="sm" solid={false} />
    </div>
    <MiniAppFinancialValue className="mt-2 text-base font-bold text-premium-navy">{value}</MiniAppFinancialValue>
    {detail ? <span className="miniapp-caption mt-1 block text-premium-muted">{detail}</span> : null}
  </MiniAppCard>
);

export const PremiumFilterChip: React.FC<React.PropsWithChildren<{
  active?: boolean;
  tone?: MiniAppPremiumTone;
  onClick?: () => void;
  icon?: LucideIcon;
}>> = ({ active = false, tone = "blue", onClick, icon: Icon, children }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className={`${MINIAPP_PREMIUM.filterChip} ${active ? `${MINIAPP_PREMIUM_TONE[tone].pill} border-transparent shadow-premium-active` : "border-premium-line bg-card text-premium-muted"}`}
  >
    {Icon ? <Icon size={15} aria-hidden="true" /> : null}
    {children}
  </button>
);

export const PremiumSearchField: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: LucideIcon;
  trailingIcon?: LucideIcon;
}> = ({ value, onChange, placeholder, icon: Icon, trailingIcon: TrailingIcon }) => (
  <label className={MINIAPP_PREMIUM.search}>
    <Icon size={20} className="shrink-0 text-premium-blue" aria-hidden="true" />
    <input
      dir="auto"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-bold text-premium-navy outline-none placeholder:font-normal placeholder:text-premium-muted"
    />
    {TrailingIcon ? <TrailingIcon size={18} className="shrink-0 text-premium-muted" aria-hidden="true" /> : null}
  </label>
);

export const PremiumProfileCard: React.FC<{
  name: string;
  subtitle: string;
  eyebrow?: string;
  status?: string;
}> = ({ name, subtitle, eyebrow = "حساب همکار", status = "آنلاین" }) => (
  <section className={`${MINIAPP_PREMIUM.card} p-5`}>
    <div className="flex items-center gap-4">
      <PremiumStoreAvatar />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={MINIAPP_PREMIUM.eyebrow}>{eyebrow}</p>
          <PremiumPill tone="mint" className="min-h-7 px-2.5">{status}</PremiumPill>
        </div>
        <h1 className="mb-0 miniapp-heading mt-2 text-2xl font-bold text-premium-navy">{name}</h1>
        <p className="mb-0 mt-1 text-xs text-premium-muted">{subtitle}</p>
      </div>
    </div>
  </section>
);

export const PremiumInfoRow: React.FC<{
  icon: LucideIcon;
  title: string;
  subtitle: string;
  tone?: MiniAppPremiumTone;
  to?: string;
}> = ({ icon, title, subtitle, tone = "blue", to }) => {
  const body = (
    <>
      <PremiumIconTile icon={icon} tone={tone} size="md" />
      <div className="min-w-0 flex-1">
        <strong className="block text-sm font-black text-premium-navy">{title}</strong>
        <span className="mt-1 block text-xs leading-6 text-premium-muted">{subtitle}</span>
      </div>
      <span className="text-lg font-light text-premium-muted" aria-hidden="true">‹</span>
    </>
  );
  if (to) return <Link to={to} className={`${MINIAPP_PREMIUM.cardInteractive} flex items-center gap-3 p-4 text-premium-ink no-underline`}>{body}</Link>;
  return <div className={`${MINIAPP_PREMIUM.card} flex items-center gap-3 p-4`}>{body}</div>;
};

export const PremiumStoreStatusCard: React.FC = () => (
  <section className={`${MINIAPP_PREMIUM.card} flex items-center gap-3 p-4`} aria-label="وضعیت فروشگاه">
    <PremiumIconTile icon={Store} tone="blue" size="lg" solid={false} />
    <div className="min-w-0 flex-1">
      <strong className="block text-sm font-black text-premium-navy">فروشگاه آنلاین</strong>
      <span className="mt-1 block text-[11px] text-premium-green">دسترسی Mini App فعال است</span>
    </div>
    <span className="size-2.5 rounded-full bg-premium-mint shadow-[0_0_0_5px_rgba(32,207,164,.12)]" aria-hidden="true" />
  </section>
);
