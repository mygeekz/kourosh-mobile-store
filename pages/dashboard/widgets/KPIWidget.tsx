import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { DashboardWidgetContext, DashboardWidgetProps } from '../types';

type Accent = 'indigo' | 'emerald' | 'blue' | 'rose' | 'amber' | 'violet';

type Props = DashboardWidgetProps & {
  title: string;
  icon: string;
  accent: Accent;
  getValue: (ctx: DashboardWidgetContext) => string;
  hint?: string;
  detailsTo?: string;
  detailsLabel?: string;
  subtitle?: string;
};

type AccentStyle = {
  ring: string;
  icon: string;
  iconWrap: string;
  orb: string;
  line: string;
  glow: string;
};



const LOADING_ACCENTS: Record<Accent, { shell: string; soft: string; line: string }> = {
  indigo: { shell: 'border-indigo-100/80 bg-indigo-50/70 dark:border-indigo-900/40 dark:bg-indigo-950/30', soft: 'bg-indigo-200/80 dark:bg-indigo-900/60', line: 'bg-indigo-300/80 dark:bg-indigo-800/70' },
  emerald: { shell: 'border-emerald-100/80 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/30', soft: 'bg-emerald-200/80 dark:bg-emerald-900/60', line: 'bg-emerald-300/80 dark:bg-emerald-800/70' },
  blue: { shell: 'border-sky-100/80 bg-sky-50/70 dark:border-sky-900/40 dark:bg-sky-950/30', soft: 'bg-sky-200/80 dark:bg-sky-900/60', line: 'bg-sky-300/80 dark:bg-sky-800/70' },
  rose: { shell: 'border-rose-100/80 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/30', soft: 'bg-rose-200/80 dark:bg-rose-900/60', line: 'bg-rose-300/80 dark:bg-rose-800/70' },
  amber: { shell: 'border-amber-100/80 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/30', soft: 'bg-amber-200/80 dark:bg-amber-900/60', line: 'bg-amber-300/80 dark:bg-amber-800/70' },
  violet: { shell: 'border-violet-100/80 bg-violet-50/70 dark:border-violet-900/40 dark:bg-violet-950/30', soft: 'bg-violet-200/80 dark:bg-violet-900/60', line: 'bg-violet-300/80 dark:bg-violet-800/70' },
};

const ACCENTS: Record<Accent, AccentStyle> = {
  indigo: {
    ring: 'ring-indigo-100 dark:ring-indigo-900/40',
    icon: 'text-indigo-700 dark:text-indigo-300',
    iconWrap: 'border-indigo-100 bg-indigo-50/90 dark:border-indigo-900/50 dark:bg-indigo-950/50',
    orb: 'bg-indigo-500/10 dark:bg-indigo-400/10',
    line: 'from-indigo-500/70 to-violet-500/40',
    glow: 'shadow-[0_18px_40px_-28px_rgba(79,70,229,0.55)]',
  },
  emerald: {
    ring: 'ring-emerald-100 dark:ring-emerald-900/40',
    icon: 'text-emerald-700 dark:text-emerald-300',
    iconWrap: 'border-emerald-100 bg-emerald-50/90 dark:border-emerald-900/50 dark:bg-emerald-950/50',
    orb: 'bg-emerald-500/10 dark:bg-emerald-400/10',
    line: 'from-emerald-500/70 to-teal-500/40',
    glow: 'shadow-[0_18px_40px_-28px_rgba(16,185,129,0.5)]',
  },
  blue: {
    ring: 'ring-sky-100 dark:ring-sky-900/40',
    icon: 'text-sky-700 dark:text-sky-300',
    iconWrap: 'border-sky-100 bg-sky-50/90 dark:border-sky-900/50 dark:bg-sky-950/50',
    orb: 'bg-sky-500/10 dark:bg-sky-400/10',
    line: 'from-sky-500/70 to-blue-500/40',
    glow: 'shadow-[0_18px_40px_-28px_rgba(14,165,233,0.5)]',
  },
  rose: {
    ring: 'ring-rose-100 dark:ring-rose-900/40',
    icon: 'text-rose-700 dark:text-rose-300',
    iconWrap: 'border-rose-100 bg-rose-50/90 dark:border-rose-900/50 dark:bg-rose-950/50',
    orb: 'bg-rose-500/10 dark:bg-rose-400/10',
    line: 'from-rose-500/70 to-pink-500/40',
    glow: 'shadow-[0_18px_40px_-28px_rgba(244,63,94,0.48)]',
  },
  amber: {
    ring: 'ring-amber-100 dark:ring-amber-900/40',
    icon: 'text-amber-700 dark:text-amber-300',
    iconWrap: 'border-amber-100 bg-amber-50/90 dark:border-amber-900/50 dark:bg-amber-950/50',
    orb: 'bg-amber-500/10 dark:bg-amber-400/10',
    line: 'from-amber-500/70 to-orange-500/40',
    glow: 'shadow-[0_18px_40px_-28px_rgba(245,158,11,0.5)]',
  },
  violet: {
    ring: 'ring-violet-100 dark:ring-violet-900/40',
    icon: 'text-violet-700 dark:text-violet-300',
    iconWrap: 'border-violet-100 bg-violet-50/90 dark:border-violet-900/50 dark:bg-violet-950/50',
    orb: 'bg-violet-500/10 dark:bg-violet-400/10',
    line: 'from-violet-500/70 to-fuchsia-500/40',
    glow: 'shadow-[0_18px_40px_-28px_rgba(139,92,246,0.5)]',
  },
};

type Mode = 'xs' | 'sm' | 'md' | 'lg';

function getMode(width: number, height: number): Mode {
  const w = width || 0;
  const h = height || 0;
  const tight = h > 0 && h < 110;

  if (w < 230 || tight) return 'xs';
  if (w < 320) return 'sm';
  if (w < 430) return 'md';
  return 'lg';
}

const MODE_CLASSES: Record<
  Mode,
  { pad: string; title: string; value: string; hint: string; iconBox: string; icon: string }
> = {
  xs: {
    pad: 'p-3',
    title: 'text-[11px] leading-4 font-semibold',
    value: 'text-[16px] leading-5 font-black',
    hint: 'text-[10px] leading-4',
    iconBox: 'w-9 h-9 rounded-2xl',
    icon: 'text-[14px]',
  },
  sm: {
    pad: 'p-4',
    title: 'text-[12px] leading-4 font-semibold',
    value: 'text-[18px] leading-6 font-black',
    hint: 'text-[10px] leading-4',
    iconBox: 'w-10 h-10 rounded-2xl',
    icon: 'text-[16px]',
  },
  md: {
    pad: 'p-5',
    title: 'text-[13px] leading-5 font-semibold',
    value: 'text-[22px] leading-7 font-black',
    hint: 'text-[11px] leading-4',
    iconBox: 'w-11 h-11 rounded-2xl',
    icon: 'text-[18px]',
  },
  lg: {
    pad: 'p-6',
    title: 'text-sm leading-5 font-semibold',
    value: 'text-3xl leading-8 font-black',
    hint: 'text-xs leading-4',
    iconBox: 'w-12 h-12 rounded-2xl',
    icon: 'text-xl',
  },
};

export default function KPIWidget({
  ctx,
  container,
  title,
  icon,
  accent,
  getValue,
  hint,
  detailsTo,
  detailsLabel,
  subtitle,
}: Props) {
  const mode = useMemo(() => getMode(container.width, container.height), [container.width, container.height]);
  const st = MODE_CLASSES[mode];
  const a = ACCENTS[accent] || ACCENTS.indigo;

  if (ctx.showLoadingSkeletons) {
    const loading = LOADING_ACCENTS[accent] || LOADING_ACCENTS.indigo;
    return (
      <div data-ui-dashboard-widget-kind="kpi" data-dashboard-widget-loading="true" className={["dashboard-kpi-widget dashboard-kpi-widget--loading h-full rounded-[26px] overflow-hidden border ring-1 ring-black/5 dark:ring-white/10", loading.shell].join(' ')}>
        <div className="p-4 h-full animate-pulse">
          <div className="flex items-center justify-between gap-3">
            <div className={["w-10 h-10 rounded-2xl", loading.soft].join(' ')} />
            <div className="flex-1">
              <div className={["h-3 rounded w-2/3 mb-2 mr-auto", loading.soft].join(' ')} />
              <div className={["h-5 rounded w-1/2 mr-auto", loading.line].join(' ')} />
            </div>
          </div>
          <div className={["mt-4 h-3 rounded w-1/3 mr-auto", loading.soft].join(' ')} />
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      data-ui-dashboard-widget-kind="kpi"
      className={[
        'dashboard-kpi-widget premium-data-shell group h-full',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-34px_rgba(15,23,42,0.26)]',
        a.ring,
        a.glow,
      ].join(' ')}
    >
      <div className={["pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-l", a.line].join(' ')} />
      <div className={["pointer-events-none absolute -left-8 -top-8 h-24 w-24 rounded-full blur-2xl", a.orb].join(' ')} />
      <div className={["pointer-events-none absolute -bottom-10 -right-8 h-24 w-24 rounded-full blur-2xl", a.orb].join(' ')} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(255,255,255,1)_42%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.82)_0%,rgba(2,6,23,1)_52%)]" />

      <div className={['relative h-full flex flex-col justify-between', st.pad].join(' ')}>
        <div className="flex items-start justify-between gap-3">
          <div className={[st.iconBox, 'shrink-0 border ring-1 flex items-center justify-center backdrop-blur-sm', a.iconWrap, a.ring, a.icon].join(' ')}>
            <i className={[icon, st.icon].join(' ')} />
          </div>

          <div className="min-w-0 flex-1 text-right">
            <div className={[st.title, 'line-clamp-2 text-slate-700 dark:text-slate-300'].join(' ')}>{title}
              {subtitle ? <div className="mt-1 text-[11px] opacity-80">{subtitle}</div> : null}</div>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className={[st.value, 'whitespace-nowrap overflow-hidden text-ellipsis text-slate-950 dark:text-white'].join(' ')}>
                {getValue(ctx)}
              </div>
              <div className={["hidden md:block h-10 w-px bg-gradient-to-b opacity-70", a.line].join(' ')} />
            </div>
          </div>
        </div>

        <div className={[st.hint, 'mt-4 flex items-center justify-between gap-2 text-slate-500 dark:text-slate-400'].join(' ')}>
          {detailsTo ? (
            <Link
              to={detailsTo}
              data-rgl-no-drag
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="opacity-90 hover:opacity-100 transition flex items-center gap-2"
            >
              <i className="fa-solid fa-up-right-from-square text-[10px] opacity-80" />
              <span className="truncate">{detailsLabel || 'جزئیات'}</span>
            </Link>
          ) : (
            <span className="opacity-80 flex items-center gap-2">
              <i className="fa-solid fa-up-right-from-square text-[10px] opacity-80" />
              <span className="truncate">{detailsLabel || 'جزئیات'}</span>
            </span>
          )}

          {hint ? <span className="opacity-90 line-clamp-1">{hint}</span> : <span className="opacity-0">.</span>}
        </div>
      </div>
    </div>
  );
}
