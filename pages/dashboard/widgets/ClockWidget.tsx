import { useEffect, useMemo, useState } from 'react';
import type { DashboardWidgetContext, DashboardWidgetProps } from '../types';
import {
  formatIranGregorianShortDate,
  formatIranLongDate,
  formatIranWeekday,
  getIranDateTimeParts,
} from '../../../utils/iranDateTime';

type ClockDensity = 'compact' | 'regular' | 'wide';
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

const toFaDigits = (value: string | number) =>
  String(value).replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);

const pad2 = (value: number) => String(value).padStart(2, '0');
const clampPercent = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

function getDensity(width: number, height: number): ClockDensity {
  if ((width || 0) < 430 || (height || 0) < 240) return 'compact';
  if ((width || 0) < 860 || (height || 0) < 320) return 'regular';
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

function resolveAutoMode({ density, hour, dueCount }: { density: ClockDensity; hour: number; dueCount: number }): ResolvedViewMode {
  if (density === 'compact') return 'minimal';
  if (dueCount > 0 || (hour >= 9 && hour < 20)) return 'manager';
  if (density === 'wide' && (hour >= 20 || hour < 7)) return 'cinematic';
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

function getClockStatus(
  parts: ReturnType<typeof getIranDateTimeParts>,
  revenueToday: number,
  dueCount: number,
): ClockStatus {
  const { hour, minute, second } = parts;
  const totalSeconds = hour * 60 * 60 + minute * 60 + second;
  const totalMinutes = totalSeconds / 60;
  const storeState = resolveStoreState(totalMinutes);
  const isStoreOpen = storeState === 'open';
  const minutesUntilClose = isStoreOpen ? STORE_CLOSE_MINUTE - totalMinutes : 0;
  const minutesUntilOpen = !isStoreOpen ? getMinutesUntilOpen(totalMinutes) : 0;
  const shiftProgress = isStoreOpen
    ? ((totalMinutes - STORE_OPEN_MINUTE) / (STORE_CLOSE_MINUTE - STORE_OPEN_MINUTE)) * 100
    : 0;

  const statusLabel = storeState === 'open'
    ? 'فروشگاه فعال'
    : storeState === 'preparing'
      ? 'آماده‌سازی'
      : 'خارج از شیفت';

  const shiftLabel = isStoreOpen
    ? hour < 12 ? 'شروع شیفت' : hour < 17 ? 'میانه عملیات' : 'جمع‌بندی فروش'
    : storeState === 'preparing' ? 'آماده‌سازی قبل از شروع' : 'پس از شیفت';

  const focusLabel = dueCount > 0
    ? 'پیگیری‌های امروز'
    : revenueToday > 0
      ? 'حفظ ریتم فروش'
      : isStoreOpen
        ? 'شروع فروش سریع'
        : 'مرور و آماده‌سازی';

  const detail = isStoreOpen
    ? `تا پایان شیفت ${formatDurationFa(minutesUntilClose)} باقی مانده`
    : `تا شروع شیفت ${formatDurationFa(minutesUntilOpen)} باقی مانده`;

  const insight = !isStoreOpen
    ? 'مرور پیگیری‌ها و آماده‌سازی کارهای روزانه در اولویت است.'
    : dueCount > 0
      ? 'پیگیری‌های باز را پیش از ساعات پایانی شیفت نهایی کنید.'
      : revenueToday > 0
        ? 'فروش امروز فعال است؛ ثبت دقیق فاکتورها را ادامه دهید.'
        : 'یک پیگیری هدفمند می‌تواند جریان فروش امروز را فعال کند.';

  return {
    hour,
    minute,
    second,
    storeState,
    isStoreOpen,
    statusLabel,
    dayPart: hour < 6 ? 'بامداد' : hour < 12 ? 'صبح' : hour < 17 ? 'بعدازظهر' : 'شب',
    shiftLabel,
    focusLabel,
    detail,
    insight,
    dayProgress: clampPercent((totalSeconds / (24 * 60 * 60)) * 100),
    shiftProgress: clampPercent(shiftProgress),
    hourAngle: ((hour % 12) + minute / 60 + second / 3600) * 30,
    minuteAngle: (minute + second / 60) * 6,
    secondAngle: second * 6,
  };
}

const MODE_OPTIONS: Array<{ value: ViewMode; icon: string; label: string }> = [
  { value: 'auto', icon: 'fa-solid fa-wand-magic-sparkles', label: 'هوشمند' },
  { value: 'minimal', icon: 'fa-regular fa-clock', label: 'ساده' },
  { value: 'manager', icon: 'fa-solid fa-chart-line', label: 'مدیریتی' },
  { value: 'cinematic', icon: 'fa-solid fa-bullseye', label: 'تمرکز' },
];

function ModeSwitcher({ value, onChange, hideFocus }: { value: ViewMode; onChange: (value: ViewMode) => void; hideFocus: boolean }) {
  return (
    <div className="app-dashboard-clock__modes" role="group" aria-label="نوع نمایش ساعت">
      {MODE_OPTIONS.filter((option) => !(hideFocus && option.value === 'cinematic')).map((option) => (
        <button
          key={option.value}
          type="button"
          data-skip-global-button="true"
          className="app-dashboard-clock__mode"
          data-active={value === option.value ? 'true' : 'false'}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          <i className={option.icon} aria-hidden="true" />
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="app-dashboard-clock__metric">
      <i className={icon} aria-hidden="true" />
      <div>
        <span className="app-dashboard-clock__metric-label">{label}</span>
        <strong className="app-dashboard-clock__metric-value">{value}</strong>
      </div>
    </div>
  );
}

function AnalogFace({ status }: { status: ClockStatus }) {
  return (
    <div className="app-dashboard-clock__analog-face" aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="51" className="app-dashboard-clock__analog-ring" />
        {Array.from({ length: 12 }).map((_, index) => (
          <line
            key={index}
            x1="60"
            y1="12"
            x2="60"
            y2="18"
            transform={`rotate(${(index / 12) * 360} 60 60)`}
            className="app-dashboard-clock__analog-tick"
          />
        ))}
        <g transform={`rotate(${status.hourAngle} 60 60)`}>
          <line x1="60" y1="63" x2="60" y2="38" className="app-dashboard-clock__analog-hour" />
        </g>
        <g transform={`rotate(${status.minuteAngle} 60 60)`}>
          <line x1="60" y1="65" x2="60" y2="27" className="app-dashboard-clock__analog-minute" />
        </g>
        <g transform={`rotate(${status.secondAngle} 60 60)`}>
          <line x1="60" y1="67" x2="60" y2="21" className="app-dashboard-clock__analog-second" />
        </g>
        <circle cx="60" cy="60" r="4.8" className="app-dashboard-clock__analog-center" />
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

  const density = useMemo(() => getDensity(container.width, container.height), [container.height, container.width]);
  const revenueToday = Number(ctx.dashboardData?.kpis?.revenueToday ?? 0);
  const dueCount = ctx.dueItems.length;
  const iranParts = useMemo(() => getIranDateTimeParts(now), [now]);
  const status = useMemo(() => getClockStatus(iranParts, revenueToday, dueCount), [dueCount, iranParts, revenueToday]);
  const resolvedMode = useMemo<ResolvedViewMode>(
    () => viewMode === 'auto' ? resolveAutoMode({ density, hour: status.hour, dueCount }) : viewMode,
    [density, dueCount, status.hour, viewMode],
  );

  const dateLabel = useMemo(() => ({
    weekday: formatIranWeekday(now),
    jalali: formatIranLongDate(now),
    gregorian: formatIranGregorianShortDate(now),
  }), [now]);

  const digital = {
    hour: toFaDigits(pad2(status.hour)),
    minute: toFaDigits(pad2(status.minute)),
    second: toFaDigits(pad2(status.second)),
  };

  const showAnalog = density !== 'compact' && resolvedMode !== 'minimal';
  const showMetrics = density !== 'compact' && resolvedMode === 'manager';
  const showFocus = density !== 'compact' && resolvedMode === 'cinematic';
  const progressValue = status.isStoreOpen ? status.shiftProgress : status.dayProgress;
  const progressLabel = status.isStoreOpen ? 'پیشرفت شیفت' : 'پیشرفت روز';
  const revenueValue = revenueToday > 0 ? ctx.formatPrice(revenueToday) : 'بدون فروش';
  const dueValue = dueCount > 0 ? `${ctx.formatNumber(dueCount)} مورد` : 'بدون پیگیری';

  return (
    <section
      dir="rtl"
      className="app-dashboard-clock"
      data-ui-dashboard-widget-kind="clock"
      data-clock-density={density}
      data-clock-view={resolvedMode}
      data-store-state={status.storeState}
    >
      <header className="app-dashboard-clock__header">
        <div className="app-dashboard-clock__identity">
          <span className="app-dashboard-clock__icon" aria-hidden="true">
            <i className="fa-regular fa-clock" />
          </span>
          <div className="app-dashboard-clock__identity-copy">
            <div className="app-dashboard-clock__title-row">
              <h3>ساعت هوشمند فروشگاه</h3>
              <span className="app-dashboard-clock__status">
                <span aria-hidden="true" />
                {status.statusLabel}
              </span>
            </div>
            <p>{status.detail}</p>
          </div>
        </div>

        {!density.includes('compact') && showModeSwitcher ? (
          <ModeSwitcher value={viewMode} onChange={setViewMode} hideFocus={density === 'regular'} />
        ) : null}
      </header>

      <div className="app-dashboard-clock__content" data-has-analog={showAnalog ? 'true' : 'false'}>
        <main className="app-dashboard-clock__main">
          <div className="app-dashboard-clock__time-row">
            <div>
              <div dir="ltr" className="app-dashboard-clock__digital" aria-label={`${digital.hour}:${digital.minute}:${digital.second}`}>
                <span>{digital.hour}</span>
                <b>:</b>
                <span>{digital.minute}</span>
                <small>:{digital.second}</small>
              </div>
              <div className="app-dashboard-clock__date">
                <span>{dateLabel.weekday}</span>
                <i aria-hidden="true" />
                <span>{dateLabel.jalali}</span>
                {density !== 'compact' ? <span dir="ltr">{dateLabel.gregorian}</span> : null}
              </div>
            </div>

            {density !== 'compact' ? (
              <div className="app-dashboard-clock__work-window">
                <span>پنجره کاری</span>
                <strong dir="ltr">09:00 — 22:00</strong>
              </div>
            ) : null}
          </div>

          <section className="app-dashboard-clock__rhythm" aria-label="وضعیت عملیاتی فروشگاه">
            <div className="app-dashboard-clock__rhythm-copy">
              <div>
                <span>وضعیت عملیاتی</span>
                <strong>{resolvedMode === 'cinematic' ? status.focusLabel : status.shiftLabel}</strong>
              </div>
              <span>{progressLabel} · {toFaDigits(Math.round(progressValue))}٪</span>
            </div>
            <div
              className="app-dashboard-clock__progress"
              role="progressbar"
              aria-label={progressLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Number(progressValue.toFixed(4))}
            >
              <span style={{ inlineSize: `${progressValue}%` }} />
            </div>
            <p>{status.insight}</p>
          </section>

          {showMetrics ? (
            <div className="app-dashboard-clock__metrics">
              <Metric icon="fa-solid fa-sack-dollar" label="فروش امروز" value={revenueValue} />
              <Metric icon="fa-solid fa-bell-concierge" label="پیگیری باز" value={dueValue} />
              <Metric icon="fa-solid fa-location-crosshairs" label="اولویت لحظه" value={status.focusLabel} />
            </div>
          ) : null}

          {showFocus ? (
            <div className="app-dashboard-clock__focus">
              <i className="fa-solid fa-location-crosshairs" aria-hidden="true" />
              <div>
                <span>اقدام پیشنهادی این لحظه</span>
                <strong>{status.focusLabel}</strong>
              </div>
            </div>
          ) : null}
        </main>

        {showAnalog ? (
          <aside className="app-dashboard-clock__analog" aria-label="ساعت آنالوگ">
            <div className="app-dashboard-clock__analog-heading">
              <span>نمای آنالوگ</span>
              <small>{status.dayPart}</small>
            </div>
            <AnalogFace status={status} />
          </aside>
        ) : null}
      </div>
    </section>
  );
}

export default function ClockWidget({ ctx, container }: DashboardWidgetProps) {
  return <UnifiedClockCard ctx={ctx} container={container} showModeSwitcher />;
}
