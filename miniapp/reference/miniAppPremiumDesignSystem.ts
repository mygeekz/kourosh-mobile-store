export type MiniAppPremiumTone = "blue" | "violet" | "mint" | "orange" | "red" | "slate";

/**
 * Kourosh Mini App premium visual reference.
 *
 * This is the only presentation contract for the v179 partner redesign.
 * Pages consume these Tailwind tokens/components instead of defining local CSS.
 */
export const MINIAPP_PREMIUM = Object.freeze({
  shell: "min-h-[var(--tg-viewport-stable-height,100vh)] bg-premium-page bg-premium-page-pattern pb-[calc(5.75rem+var(--tg-safe-area-inset-bottom,0px))] pt-[var(--tg-content-safe-area-inset-top,0px)] font-sans text-premium-ink",
  content: "mx-auto w-full max-w-[30rem] px-4 pb-2 pt-3",
  page: "space-y-4",
  topBar: "sticky top-0 z-30 border-b border-white/60 bg-premium-page/90 backdrop-blur-xl",
  topBarInner: "mx-auto grid h-14 max-w-[30rem] grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-4",
  roundButton: "flex size-10 items-center justify-center rounded-full border border-white/90 bg-white/90 text-premium-navy shadow-premium-float backdrop-blur-xl transition active:scale-95",
  title: "truncate text-center text-[1.15rem] font-black tracking-tight text-premium-navy",
  card: "rounded-[1.5rem] border border-white/95 bg-white/[0.92] shadow-premium-card backdrop-blur-xl",
  cardInteractive: "rounded-[1.5rem] border border-white/95 bg-white/[0.92] shadow-premium-card backdrop-blur-xl transition duration-200 active:scale-[0.985]",
  insetCard: "rounded-[1.3rem] border border-premium-line/70 bg-white/80 shadow-premium-soft",
  eyebrow: "m-0 text-[11px] font-black text-premium-blue",
  pageTitle: "m-0 text-[1.75rem] font-black tracking-tight text-premium-navy",
  pageSubtitle: "mt-1.5 text-[12px] leading-6 text-premium-muted",
  sectionTitle: "m-0 text-[1.2rem] font-black text-premium-navy",
  sectionSubtitle: "mt-1 text-[11px] leading-5 text-premium-muted",
  label: "text-[10px] font-bold text-premium-muted",
  value: "font-black tabular-nums text-premium-navy",
  hero: "relative isolate min-h-[10.75rem] overflow-hidden rounded-[1.75rem] border border-white/25 bg-premium-hero text-white shadow-premium-hero",
  heroInner: "relative z-10 flex min-h-[10.75rem] flex-col justify-between p-5 sm:p-6",
  heroLine: "border-white/20",
  search: "flex min-h-[3.4rem] items-center gap-3 rounded-[1.5rem] border border-white/95 bg-white/95 px-4 shadow-premium-card focus-within:ring-2 focus-within:ring-premium-blue/[0.15]",
  filterRail: "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  filterChip: "inline-flex min-h-[2.75rem] shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-[11px] font-black shadow-premium-soft transition active:scale-95",
  dock: "fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[30rem] rounded-t-[1.65rem] border-x border-t border-white/95 bg-white/[0.96] px-2 pb-[max(0.35rem,var(--tg-safe-area-inset-bottom,0px))] pt-1.5 shadow-premium-dock backdrop-blur-2xl",
  navItem: "relative flex min-h-[3.35rem] flex-col items-center justify-center gap-1 rounded-[1.15rem] px-2 text-[10px] font-black no-underline transition duration-200",
  navActive: "bg-premium-blue-soft text-premium-blue shadow-premium-active",
  navInactive: "text-premium-muted",
  loadMore: "min-h-[3.25rem] w-full rounded-[1.3rem] border border-premium-blue/[0.15] bg-white/90 px-4 text-sm font-black text-premium-blue shadow-premium-soft transition active:scale-[0.99] disabled:opacity-60",
});

export const MINIAPP_PREMIUM_TONE = Object.freeze({
  blue: {
    icon: "border-premium-blue/[0.15] bg-premium-icon-blue text-white shadow-premium-icon-blue",
    pill: "border-premium-blue/[0.15] bg-premium-blue-soft text-premium-blue",
    dot: "bg-premium-blue",
  },
  violet: {
    icon: "border-premium-violet/[0.15] bg-premium-icon-violet text-white shadow-premium-icon-violet",
    pill: "border-premium-violet/[0.15] bg-premium-violet-soft text-premium-violet",
    dot: "bg-premium-violet",
  },
  mint: {
    icon: "border-premium-mint/[0.15] bg-premium-icon-mint text-white shadow-premium-icon-mint",
    pill: "border-premium-mint/[0.15] bg-premium-mint-soft text-premium-green",
    dot: "bg-premium-mint",
  },
  orange: {
    icon: "border-premium-orange/[0.15] bg-premium-icon-orange text-white shadow-premium-icon-orange",
    pill: "border-premium-orange/[0.15] bg-premium-orange-soft text-premium-orange-deep",
    dot: "bg-premium-orange",
  },
  red: {
    icon: "border-premium-red/[0.15] bg-premium-red-soft text-premium-red shadow-premium-soft",
    pill: "border-premium-red/[0.15] bg-premium-red-soft text-premium-red",
    dot: "bg-premium-red",
  },
  slate: {
    icon: "border-premium-line bg-premium-slate-soft text-premium-muted shadow-premium-soft",
    pill: "border-premium-line bg-premium-slate-soft text-premium-muted",
    dot: "bg-premium-muted",
  },
});
