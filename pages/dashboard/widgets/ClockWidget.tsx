import { useEffect, useMemo, useState } from 'react';
import type { DashboardWidgetContext, DashboardWidgetProps } from '../types';
import { formatIranGregorianShortDate, formatIranLongDate, formatIranWeekday, getIranDateTimeParts } from '../../../utils/iranDateTime';

type ClockMode = 'compact' | 'regular' | 'wide';
type ViewMode = 'auto' | 'minimal' | 'manager' | 'cinematic';
type ResolvedViewMode = Exclude<ViewMode, 'auto'>;
type StoreState = 'open' | 'preparing' | 'closed';

type ClockStatus = {
  hour: number;
  minute: number;
  second: number;
  storeState: StoreState;
  isStoreOpen: boolean;
  statusLabel: string;
  statusIcon: string;
  dayPart: string;
  shiftLabel: string;
  focusLabel: string;
  detail: string;
  insight: string;
  dayProgress: number;
  shiftProgress: number;
  hourAngle: number;
  minuteAngle: number;
  secondAngle: number;
};

const VIEW_MODE_KEY = 'kourosh.dashboard.clock.viewMode';
const STORE_OPEN_MINUTE = 9 * 60;
const STORE_CLOSE_MINUTE = 22 * 60;
const PREPARING_WINDOW_MINUTES = 60;

function toFaDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function getMode(width: number, height: number): ClockMode {
  if ((width || 0) < 360 || (height || 0) < 190) return 'compact';
  if ((width || 0) < 680 || (height || 0) < 260) return 'regular';
  return 'wide';
}

function formatDurationFa(totalMinutes: number) {
  const safe = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (hours <= 0) return `${toFaDigits(minutes)} دقیقه`;
  if (minutes === 0) return `${toFaDigits(hours)} ساعت`;
  return `${toFaDigits(hours)} ساعت و ${toFaDigits(minutes)} دقیقه`;
}

function getStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'auto';
  const raw = window.localStorage.getItem(VIEW_MODE_KEY);
  return raw === 'auto' || raw === 'minimal' || raw === 'manager' || raw === 'cinematic' ? raw : 'auto';
}

function resolveAutoMode({ mode, hour, dueCount }: { mode: ClockMode; hour: number; dueCount: number }): ResolvedViewMode {
  if (mode === 'compact') return 'minimal';
  if (dueCount > 0 || (hour >= 9 && hour < 20)) return 'manager';
  if (mode === 'wide' && (hour >= 20 || hour < 7)) return 'cinematic';
  return 'minimal';
}

function resolveStoreState(totalMinutes: number): StoreState {
  if (totalMinutes >= STORE_OPEN_MINUTE && totalMinutes < STORE_CLOSE_MINUTE) return 'open';
  if (totalMinutes >= STORE_OPEN_MINUTE - PREPARING_WINDOW_MINUTES && totalMinutes < STORE_OPEN_MINUTE) return 'preparing';
  return 'closed';
}

function getMinutesUntilOpen(totalMinutes: number) {
  return totalMinutes < STORE_OPEN_MINUTE
    ? STORE_OPEN_MINUTE - totalMinutes
    : 24 * 60 - totalMinutes + STORE_OPEN_MINUTE;
}

function getClockStatus(parts: ReturnType<typeof getIranDateTimeParts>, revenueToday: number, dueCount: number): ClockStatus {
  const { hour, minute, second } = parts;
  const totalMinutes = hour * 60 + minute;
  const storeState = resolveStoreState(totalMinutes);
  const isStoreOpen = storeState === 'open';
  const minutesUntilClose = isStoreOpen ? STORE_CLOSE_MINUTE - totalMinutes : 0;
  const minutesUntilOpen = !isStoreOpen ? getMinutesUntilOpen(totalMinutes) : 0;
  const openWindowMinutes = STORE_CLOSE_MINUTE - STORE_OPEN_MINUTE;
  const shiftProgress = isStoreOpen ? ((totalMinutes - STORE_OPEN_MINUTE) / openWindowMinutes) * 100 : 0;
  const dayPart = hour < 6 ? 'بامداد' : hour < 12 ? 'صبح' : hour < 17 ? 'بعدازظهر' : 'شب';

  const statusLabel = storeState === 'open'
    ? 'فروشگاه فعال'
    : storeState === 'preparing'
      ? 'در حال آماده‌سازی'
      : 'خارج از ساعت کاری';
  const statusIcon = storeState === 'open' ? 'fa-store' : storeState === 'preparing' ? 'fa-mug-hot' : 'fa-door-closed';
  const shiftLabel = isStoreOpen
    ? hour < 12 ? 'شروع شیفت' : hour < 17 ? 'میانه عملیات' : 'جمع‌بندی فروش'
    : storeState === 'preparing' ? 'آماده‌سازی قبل از شروع' : 'پس از شیفت';
  const detail = isStoreOpen
    ? `تا پایان شیفت ${formatDurationFa(minutesUntilClose)} باقی مانده`
    : `تا شروع شیفت ${formatDurationFa(minutesUntilOpen)} باقی مانده`;
  const focusLabel = dueCount > 0
    ? 'پیگیری‌های امروز'
    : revenueToday > 0
      ? 'حفظ ریتم فروش'
      : isStoreOpen
        ? 'شروع فروش سریع'
        : 'مرور و آماده‌سازی';
  const insight = !isStoreOpen
    ? 'زمان مناسب برای آماده‌سازی فروش، مرور پیگیری‌ها و نظم‌دهی کارهای روزانه است.'
    : dueCount > 0
      ? 'پیگیری‌های باز را زودتر نهایی کنید تا فشار کاری پایان روز کمتر شود.'
      : revenueToday > 0
        ? 'فروش امروز فعال است؛ تبدیل مشتری و ثبت دقیق فاکتورها در اولویت باشد.'
        : 'روز کاری شروع شده است؛ یک پیگیری هدفمند می‌تواند جریان فروش امروز را فعال کند.';

  return {
    hour,
    minute,
    second,
    storeState,
    isStoreOpen,
    statusLabel,
    statusIcon,
    dayPart,
    shiftLabel,
    focusLabel,
    detail,
    insight,
    dayProgress: clampPercent((totalMinutes / (24 * 60)) * 100),
    shiftProgress: clampPercent(shiftProgress),
    hourAngle: ((hour % 12) + minute / 60 + second / 3600) * 30,
    minuteAngle: (minute + second / 60) * 6,
    secondAngle: second * 6,
  };
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-ui-dashboard-clock-mode={label}
      className={`app-command-button inline-flex h-8 items-center justify-center gap-1.5 rounded-xl px-2.5 text-[10px] font-black transition ${
        active
          ? 'border border-slate-300 bg-white text-slate-950 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white'
          : 'border border-transparent text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
      }`}
    >
      <i className={`${icon} text-[11px]`} />
      <span>{label}</span>
    </button>
  );
}

function InfoTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="dashboard-smart-clock-tile min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
          <i className={`${icon} text-[12px]`} />
        </span>
        <div className="min-w-0 text-right">
          <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">{label}</div>
          <div className="mt-1 truncate text-[13px] font-black text-slate-900 dark:text-slate-50">{value}</div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: ClockStatus }) {
  const tone = status.storeState === 'open'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-200'
    : status.storeState === 'preparing'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200'
      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300';

  return (
    <span className={`inline-flex min-h-[28px] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${tone}`}>
      <i className={`fa-solid ${status.statusIcon} text-[10px]`} />
      {status.statusLabel}
    </span>
  );
}

function AnalogFace({ status, compact = false, focus = false }: { status: ClockStatus; compact?: boolean; focus?: boolean }) {
  return (
    <div className={`dashboard-smart-clock-analog relative mx-auto flex ${compact ? 'h-44 w-44' : 'h-60 w-60'} items-center justify-center rounded-full border shadow-[0_20px_48px_-40px_rgba(15,23,42,0.42)] ${focus ? 'border-white/10 bg-slate-900 text-white' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950'}`}>
      <svg viewBox="0 0 120 120" className={`h-full w-full ${focus ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`} aria-hidden="true">
        <circle cx="60" cy="60" r="51" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-800" />
        {Array.from({ length: 12 }).map((_, index) => {
          const angle = (index / 12) * 360;
          return (
            <line
              key={index}
              x1="60"
              y1="12"
              x2="60"
              y2="20"
              transform={`rotate(${angle} 60 60)`}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="text-slate-400 dark:text-slate-600"
            />
          );
        })}
        <g transform={`rotate(${status.hourAngle} 60 60)`}>
          <line x1="60" y1="63" x2="60" y2="37" stroke="currentColor" strokeWidth="4.6" strokeLinecap="round" />
        </g>
        <g transform={`rotate(${status.minuteAngle} 60 60)`}>
          <line x1="60" y1="65" x2="60" y2="26" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className={focus ? 'text-slate-100' : 'text-slate-700 dark:text-slate-200'} />
        </g>
        <g transform={`rotate(${status.secondAngle} 60 60)`}>
          <line x1="60" y1="67" x2="60" y2="20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-rose-500" />
        </g>
        <circle cx="60" cy="60" r="5.6" fill="currentColor" />
        <circle cx="60" cy="60" r="2" fill="white" opacity="0.94" />
      </svg>
    </div>
  );
}

export type UnifiedClockCardProps = {
  ctx: DashboardWidgetContext;
  container: { width: number; height: number };
  showModeSwitcher?: boolean;
};

export function UnifiedClockCard({ ctx, container, showModeSwitcher = true }: UnifiedClockCardProps) {
  const [now, setNow] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(VIEW_MODE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = (event: StorageEvent) => {
      if (event.key === VIEW_MODE_KEY) setViewMode(getStoredViewMode());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const mode = useMemo(() => getMode(container.width, container.height), [container.width, container.height]);
  const compact = mode === 'compact';
  const regular = mode === 'regular';
  const revenueToday = Number(ctx.dashboardData?.kpis?.revenueToday ?? 0);
  const dueCount = ctx.dueItems.length;
  const iranParts = useMemo(() => getIranDateTimeParts(now), [now]);
  const status = useMemo(() => getClockStatus(iranParts, revenueToday, dueCount), [iranParts, revenueToday, dueCount]);
  const resolvedMode = useMemo<ResolvedViewMode>(() => viewMode === 'auto' ? resolveAutoMode({ mode, hour: status.hour, dueCount }) : viewMode, [viewMode, mode, status.hour, dueCount]);
  const showAnalog = !compact && resolvedMode !== 'minimal';
  const dateLabel = useMemo(() => ({
    weekday: formatIranWeekday(now),
    jalali: formatIranLongDate(now),
    gregorian: formatIranGregorianShortDate(now),
  }), [now]);
  const digital = useMemo(() => ({
    hour: toFaDigits(pad2(status.hour)),
    minute: toFaDigits(pad2(status.minute)),
    second: toFaDigits(pad2(status.second)),
  }), [status.hour, status.minute, status.second]);
  const revenueValue = revenueToday > 0 ? ctx.formatPrice(revenueToday) : 'بدون فروش امروز';
  const dueValue = dueCount > 0 ? `${ctx.formatNumber(dueCount)} مورد` : 'بدون پیگیری فوری';
  const isManagerMode = resolvedMode === 'manager';
  const isFocusMode = resolvedMode === 'cinematic';
  const progressLabel = isFocusMode
    ? status.isStoreOpen ? 'زمان باقی‌مانده شیفت' : 'آمادگی تا شروع'
    : status.isStoreOpen ? 'پیشرفت شیفت' : 'پیشرفت روز';
  const progressValue = status.isStoreOpen ? status.shiftProgress : status.dayProgress;
  const rhythmTitle = isFocusMode ? 'اولویت عملیاتی فروشگاه' : 'وضعیت عملیاتی فروشگاه';
  const rhythmSubtitle = isFocusMode ? status.focusLabel : status.shiftLabel;
  const analogTitle = isFocusMode ? 'نمای تمرکز فروشگاه' : 'ساعت آنالوگ';
  const analogDescription = isFocusMode
    ? 'نمای خلوت برای پیگیری زمان و اولویت بعدی فروشگاه.'
    : 'نمایش سریع زمان، شیفت و وضعیت کاری فروشگاه';

  return (
    <section
      dir="rtl"
      data-ui-dashboard-widget-kind="clock"
      data-dashboard-clock-mode={resolvedMode}
      data-dashboard-store-open={status.isStoreOpen ? 'true' : 'false'}
      className={`dashboard-clock-card dashboard-smart-clock-card relative h-full overflow-hidden rounded-[28px] border p-4 shadow-[0_24px_62px_-46px_rgba(15,23,42,0.35)] transition md:p-5 ${isFocusMode ? 'border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50' : 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100'}`}
    >
      <div className="relative z-[1] flex h-full flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${isFocusMode ? 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'}`}>
              <i className={`${isFocusMode ? 'fa-solid fa-bullseye' : 'fa-regular fa-clock'} text-[18px]`} />
            </span>
            <div className="min-w-0 text-right">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`text-sm font-black md:text-[15px] ${isFocusMode ? 'text-slate-950 dark:text-white' : 'text-slate-950 dark:text-white'}`}>ساعت هوشمند فروشگاه</h3>
                <StatusPill status={status} />
              </div>
              <p className={`mt-1 text-xs font-bold leading-6 ${isFocusMode ? 'text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>{status.detail}</p>
            </div>
          </div>

          {!compact && showModeSwitcher ? (
            <div className={`flex shrink-0 flex-wrap items-center gap-1 rounded-2xl border p-1 ${isFocusMode ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70'}`}>
              <ModeButton active={viewMode === 'auto'} icon="fa-solid fa-wand-magic-sparkles" label="هوشمند" onClick={() => setViewMode('auto')} />
              <ModeButton active={viewMode === 'minimal'} icon="fa-regular fa-clock" label="ساده" onClick={() => setViewMode('minimal')} />
              <ModeButton active={viewMode === 'manager'} icon="fa-solid fa-chart-line" label="مدیریتی" onClick={() => setViewMode('manager')} />
              {!regular ? <ModeButton active={viewMode === 'cinematic'} icon="fa-solid fa-bullseye" label="تمرکز" onClick={() => setViewMode('cinematic')} /> : null}
            </div>
          ) : null}
        </header>

        <div className={`grid flex-1 gap-5 ${showAnalog ? isFocusMode ? 'xl:grid-cols-[300px_minmax(0,1fr)]' : 'xl:grid-cols-[minmax(0,1fr)_280px]' : 'grid-cols-1'}`}>
          <main className={`min-w-0 space-y-4 ${isFocusMode && showAnalog ? 'xl:order-2' : ''}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <div dir="ltr" className={`${compact ? 'text-[34px]' : regular ? 'text-[46px]' : isFocusMode ? 'text-[72px]' : 'text-[60px]'} font-black leading-none tracking-[0.045em] tabular-nums ${isFocusMode ? 'text-slate-950 dark:text-white' : 'text-slate-950 dark:text-white'}`}>
                  {digital.hour}<span className="mx-1 text-slate-400 dark:text-slate-600">:</span>{digital.minute}<span className="mx-1 text-[0.68em] text-slate-400 dark:text-slate-600">:</span><span className="text-[0.68em] text-slate-700 dark:text-slate-300">{digital.second}</span>
                </div>
                <div className={`mt-2 flex flex-wrap items-center gap-2 text-sm font-bold ${isFocusMode ? 'text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>
                  <span>{dateLabel.weekday}</span>
                  <span className="text-slate-300 dark:text-slate-700">•</span>
                  <span>{dateLabel.jalali}</span>
                  {!compact ? <span dir="ltr" className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] dark:border-slate-800">{dateLabel.gregorian}</span> : null}
                </div>
              </div>

              {!compact ? (
                <div className={`rounded-2xl border px-3 py-2 text-right ${isFocusMode ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70'}`}>
                  <div className={`text-[10px] font-black ${isFocusMode ? 'text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>پنجره کاری</div>
                  <div dir="ltr" className={`mt-1 text-xs font-black ${isFocusMode ? 'text-slate-950 dark:text-white' : 'text-slate-900 dark:text-slate-50'}`}>09:00 — 22:00</div>
                </div>
              ) : null}
            </div>

            <div className={`rounded-[24px] border p-4 ${isFocusMode ? 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-right">
                  <div className={`text-xs font-black ${isFocusMode ? 'text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>{rhythmTitle}</div>
                  <div className={`mt-1 text-sm font-black ${isFocusMode ? 'text-slate-950 dark:text-white' : 'text-slate-950 dark:text-white'}`}>{rhythmSubtitle}</div>
                </div>
                <div className={`text-xs font-black ${isFocusMode ? 'text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>{progressLabel}: {toFaDigits(Math.round(progressValue))}٪</div>
              </div>
              <div className={`mt-3 h-2 overflow-hidden rounded-full ${isFocusMode ? 'bg-slate-200 dark:bg-slate-800' : 'bg-slate-200 dark:bg-slate-800'}`}>
                <div className={`h-full rounded-full transition-all duration-700 ${isFocusMode ? 'bg-slate-950 dark:bg-white' : 'bg-slate-950 dark:bg-white'}`} style={{ width: `${progressValue}%` }} />
              </div>
              <p className={`mt-3 text-xs font-bold leading-6 ${isFocusMode ? 'text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-300'}`}>{status.insight}</p>
            </div>

            {!compact && isManagerMode ? (
              <div className={`grid gap-3 ${regular ? 'grid-cols-1' : 'grid-cols-[repeat(auto-fit,minmax(160px,1fr))]'}`}>
                <InfoTile icon="fa-solid fa-sack-dollar" label="فروش امروز" value={revenueValue} />
                <InfoTile icon="fa-solid fa-bell-concierge" label="پیگیری‌های باز" value={dueValue} />
                <InfoTile icon="fa-solid fa-location-crosshairs" label="اولویت لحظه" value={status.focusLabel} />
              </div>
            ) : null}

            {!compact && isFocusMode ? (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70 p-4 text-right">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                    <i className="fa-solid fa-location-crosshairs text-[14px]" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-slate-600 dark:text-slate-300">اولویت پیشنهادی این لحظه</div>
                    <div className="mt-1 text-base font-black text-slate-950 dark:text-white">{status.focusLabel}</div>
                    <p className="mt-2 text-xs font-bold leading-6 text-slate-600 dark:text-slate-300">در این نما اطلاعات اضافه کمتر می‌شود تا زمان، وضعیت فروشگاه و اقدام بعدی سریع‌تر دیده شود.</p>
                  </div>
                </div>
              </div>
            ) : null}
          </main>

          {showAnalog ? (
            <aside className={`rounded-[26px] border p-4 ${isFocusMode ? 'border-slate-200 bg-white xl:order-1 dark:border-slate-800 dark:bg-slate-900/70' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/70'}`}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="text-right">
                  <div className={`text-sm font-black ${isFocusMode ? 'text-slate-950 dark:text-white' : 'text-slate-950 dark:text-white'}`}>{analogTitle}</div>
                  <div className={`mt-1 text-xs leading-6 ${isFocusMode ? 'text-slate-600 dark:text-slate-300' : 'text-slate-600 dark:text-slate-400'}`}>{analogDescription}</div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${isFocusMode ? 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
                  <i className="fa-solid fa-circle" />
                  {status.dayPart}
                </span>
              </div>
              <AnalogFace status={status} compact={regular} focus={isFocusMode} />
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function ClockWidget({ ctx, container }: DashboardWidgetProps) {
  return <UnifiedClockCard ctx={ctx} container={container} showModeSwitcher />;
}
