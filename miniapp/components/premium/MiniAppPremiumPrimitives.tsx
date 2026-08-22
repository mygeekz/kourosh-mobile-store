import React from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "../../../components/lucide-react";
import { Clock3, Store, WalletCards } from "../../../components/lucide-react";
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
  <span className={`inline-flex items-center rounded-full border font-black shadow-premium-soft ${compact ? "min-h-7 gap-1 px-2 text-[9px]" : "min-h-9 gap-1.5 px-3.5 text-[11px]"} ${MINIAPP_PREMIUM_TONE[tone].pill} ${className}`}>
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
  <div className="flex items-end justify-between gap-3">
    <div className="min-w-0">
      <h2 className={MINIAPP_PREMIUM.sectionTitle}>{title}</h2>
      {subtitle ? <p className={MINIAPP_PREMIUM.sectionSubtitle}>{subtitle}</p> : null}
    </div>
    {actionLabel && actionTo ? (
      <Link to={actionTo} className="shrink-0 text-[11px] font-black text-premium-blue no-underline">
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
  const heroPillClass = statusTone === "mint"
    ? "border-white/25 bg-premium-green/95 text-white shadow-[0_10px_24px_-16px_rgba(19,140,99,.95)] backdrop-blur-md"
    : statusTone === "red"
      ? "border-white/25 bg-premium-red/95 text-white shadow-[0_10px_24px_-16px_rgba(239,68,68,.95)] backdrop-blur-md"
      : "border-white/20 bg-white/[0.14] text-white shadow-none backdrop-blur-md";
  const usingReferenceImage = Boolean(backgroundImageSrc);
  const statusDotClass = statusTone === "mint"
    ? "bg-premium-green shadow-[0_0_0_6px_rgba(19,140,99,.16)]"
    : statusTone === "red"
      ? "bg-premium-red shadow-[0_0_0_6px_rgba(239,68,68,.16)]"
      : "bg-white shadow-[0_0_0_6px_rgba(255,255,255,.14)]";
  const statusTextClass = statusTone === "mint" ? "text-premium-green-bright" : statusTone === "red" ? "text-[#ffb1b1]" : "text-white/92";

  if (usingReferenceImage) {
    return (
      <section className={`${MINIAPP_PREMIUM.hero} h-[clamp(10.5rem,43vw,12rem)] min-h-0`} aria-label={title}>
        <img
          src={backgroundImageSrc}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-left"
          aria-hidden="true"
        />
        <span className="pointer-events-none absolute inset-y-0 right-0 w-[62%] bg-[linear-gradient(270deg,rgba(7,36,201,.74)_0%,rgba(7,36,201,.58)_45%,rgba(7,36,201,.18)_78%,rgba(7,36,201,0)_100%)]" aria-hidden="true" />
        <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5">
          <div className="ml-auto w-[58%] max-w-[13rem] text-right sm:w-[56%] sm:max-w-none">
            <div className="flex items-center justify-end gap-2 text-white/92 drop-shadow-[0_3px_10px_rgba(0,0,0,.2)]">
              <span className="text-[0.86rem] font-bold sm:text-[0.9rem]">{title}</span>
            </div>
            <div className="mt-2.5 text-[1.9rem] font-black leading-[1.02] tracking-tight tabular-nums text-white drop-shadow-[0_8px_20px_rgba(0,0,0,.24)] sm:mt-3 sm:text-[2.15rem]">
              {amount}
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="inline-flex items-center gap-2.5 text-right">
              <span className={`inline-block size-2.5 rounded-full animate-pulse ${statusDotClass}`} aria-hidden="true" />
              <span className={`text-[0.88rem] font-bold ${statusTextClass} drop-shadow-[0_2px_6px_rgba(0,0,0,.18)] sm:text-[0.92rem]`}>{status}</span>
            </div>
            {updatedLabel ? (
              <span className="flex items-center gap-1.5 text-[0.78rem] font-bold text-white/86 drop-shadow-[0_2px_6px_rgba(0,0,0,.2)] sm:text-[0.82rem]">
                <Clock3 size={14} aria-hidden="true" />
                {updatedLabel}
              </span>
            ) : <span />}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={MINIAPP_PREMIUM.hero} aria-label={title}>
      {artwork ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[42%] items-center justify-start pl-2" aria-hidden="true">
          <img
            src="/miniapp/premium/wallet-hero.webp"
            alt=""
            className="h-[7.7rem] w-auto max-w-full object-contain object-left opacity-100 drop-shadow-[0_18px_22px_rgba(0,20,92,.32)]"
          />
        </div>
      ) : null}
      <span className="pointer-events-none absolute -bottom-16 right-[-8%] h-40 w-[75%] rotate-[-7deg] rounded-[50%] border-t border-white/[0.35] bg-white/5 blur-[1px]" aria-hidden="true" />
      <span className="pointer-events-none absolute right-5 top-5 size-28 rounded-full bg-premium-violet/20 blur-3xl" aria-hidden="true" />
      <div className={MINIAPP_PREMIUM.heroInner}>
        <div className="ml-auto w-[60%] text-right sm:w-[58%]">
          <div className="flex items-center justify-end gap-2 text-white/80">
            <span className="text-[12px] font-bold">{title}</span>
            <WalletCards size={20} strokeWidth={2} aria-hidden="true" />
          </div>
          <div className="mt-4 text-[2rem] font-black leading-[1.18] tracking-tight tabular-nums text-white sm:text-[2.2rem]">{amount}</div>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-white/20 pt-3.5">
          {updatedLabel ? (
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-white/70">
              <Clock3 size={14} aria-hidden="true" />
              {updatedLabel}
            </span>
          ) : null}
          <PremiumPill tone={statusTone} className={heroPillClass}>{status}</PremiumPill>
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
  <Link to={to} className={`${MINIAPP_PREMIUM.cardInteractive} flex ${compact ? "min-h-[4.55rem] gap-2.5 p-3" : "min-h-[5.75rem] gap-3 p-4"} text-premium-ink no-underline`}>
    <PremiumIconTile icon={icon} tone={tone} size={compact ? "md" : "lg"} />
    <span className="min-w-0 flex-1 self-center">
      <strong className={`block font-black text-premium-navy ${compact ? "text-[13px] leading-5" : "text-[15px] leading-7"}`}>{title}</strong>
      <span className={`mt-0.5 block text-premium-muted ${compact ? "text-[10px] leading-4" : "text-[11px] leading-5"}`}>{subtitle}</span>
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
  <div className={`${MINIAPP_PREMIUM.card} min-w-0 p-3.5`}>
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold leading-5 text-premium-muted">{label}</span>
        <strong className="mt-1.5 block truncate text-[16px] font-black tabular-nums text-premium-navy">{value}</strong>
        {detail ? <span className="mt-1 block text-[10px] leading-5 text-premium-muted">{detail}</span> : null}
      </div>
      <PremiumIconTile icon={icon} tone={tone} size="sm" solid={false} />
    </div>
  </div>
);

export const PremiumFilterChip: React.FC<React.PropsWithChildren<{
  active?: boolean;
  tone?: MiniAppPremiumTone;
  onClick?: () => void;
  icon?: LucideIcon;
}>> = ({ active = false, tone = "blue", onClick, icon: Icon, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${MINIAPP_PREMIUM.filterChip} ${active ? `${MINIAPP_PREMIUM_TONE[tone].pill} border-transparent shadow-premium-active` : "border-white/95 bg-white/90 text-premium-muted"}`}
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
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
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
        <h1 className="mb-0 mt-2 truncate text-[1.7rem] font-black tracking-tight text-premium-navy">{name}</h1>
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
        <span className="mt-1 block text-[11px] leading-5 text-premium-muted">{subtitle}</span>
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
