export type MiniAppVisualTone = "primary" | "success" | "warning" | "danger" | "info" | "muted";

export const MINIAPP_VISUAL_REFERENCE = Object.freeze({
  page: "space-y-5 pb-2",
  topBar: "sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur-md",
  circularAction: "flex size-10 items-center justify-center rounded-full border border-border/70 bg-card text-foreground shadow-lg shadow-primary/5 transition active:scale-95",
  card: "rounded-[var(--radius-lg)] border border-border/70 bg-card/95 shadow-lg shadow-primary/5",
  cardInteractive: "rounded-[var(--radius-lg)] border border-border/70 bg-card/95 shadow-lg shadow-primary/5 transition active:scale-[0.99]",
  softCard: "rounded-[var(--radius-lg)] border border-border/60 bg-surfaceMuted/55 shadow-sm",
  hero: "relative overflow-hidden rounded-[var(--radius-lg)] border border-primary/20 bg-gradient-to-br from-primary via-primary to-info p-5 text-primary-foreground shadow-xl shadow-primary/20",
  heroGlow: "absolute -left-16 -top-14 size-44 rounded-full bg-primary-foreground/10 blur-3xl",
  heroGlowSecondary: "absolute -bottom-20 -right-12 size-52 rounded-full bg-accent/20 blur-3xl",
  eyebrow: "text-[11px] font-extrabold text-primary",
  pageTitle: "m-0 text-2xl font-black tracking-tight text-foreground",
  pageSubtitle: "mt-1 text-xs leading-6 text-mutedText",
  sectionTitle: "m-0 text-base font-black text-foreground",
  sectionSubtitle: "mt-1 text-[11px] leading-5 text-mutedText",
  label: "text-[11px] font-bold text-mutedText",
  value: "text-lg font-black tabular-nums text-foreground",
  valueLarge: "text-3xl font-black tabular-nums tracking-tight",
  divider: "border-border/60",
  bottomDock: "fixed inset-x-3 bottom-[max(0.65rem,var(--tg-safe-area-inset-bottom,0px))] z-30 mx-auto max-w-xl rounded-[var(--radius-lg)] border border-border/70 bg-card/95 p-1.5 shadow-xl shadow-primary/10 backdrop-blur-md",
  navItem: "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-1 text-[10px] font-extrabold no-underline transition",
  navActive: "bg-primary/10 text-primary shadow-sm",
  navInactive: "text-mutedText",
  search: "flex min-h-12 items-center gap-2 rounded-[var(--radius-lg)] border border-border/70 bg-card px-3 text-sm shadow-sm focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10",
  filterChip: "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-4 text-xs font-extrabold transition active:scale-95",
  loadMore: "min-h-11 w-full rounded-[var(--radius-md)] border border-primary/30 bg-primary/5 px-4 text-sm font-extrabold text-primary transition active:scale-[0.99] disabled:opacity-60",
});

export const MINIAPP_VISUAL_TONE = Object.freeze({
  primary: {
    icon: "border-primary/15 bg-primary/10 text-primary",
    pill: "border-primary/20 bg-primary/10 text-primary",
    soft: "bg-primary/5",
  },
  success: {
    icon: "border-success/15 bg-success/10 text-success",
    pill: "border-success/20 bg-success/10 text-success",
    soft: "bg-success/5",
  },
  warning: {
    icon: "border-warning/15 bg-warning/10 text-warning",
    pill: "border-warning/20 bg-warning/10 text-warning",
    soft: "bg-warning/5",
  },
  danger: {
    icon: "border-danger/15 bg-danger/10 text-danger",
    pill: "border-danger/20 bg-danger/10 text-danger",
    soft: "bg-danger/5",
  },
  info: {
    icon: "border-info/15 bg-info/10 text-info",
    pill: "border-info/20 bg-info/10 text-info",
    soft: "bg-info/5",
  },
  muted: {
    icon: "border-border/70 bg-surfaceMuted/60 text-mutedText",
    pill: "border-border/70 bg-surfaceMuted/60 text-secondaryText",
    soft: "bg-surfaceMuted/50",
  },
});
