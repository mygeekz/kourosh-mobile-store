import React from 'react';
import { Button } from '@/components/ui';
import { STANDARD_STYLE_PALETTES, STANDARD_STYLE_PALETTE_KEYS, type StandardStylePalette } from '../../config/stylePalettes';
import { useStyle } from '../../hooks/useStyle';
import LoadingButtonVisualReportPanel from './LoadingButtonVisualReportPanel';
import DashboardVisualReportPanel from './DashboardVisualReportPanel';
import PwaPlatformInstallReportPanel from './PwaPlatformInstallReportPanel';

type LabViewport = 'mobile' | 'tablet' | 'desktop';
type LabScenarioId = 'save' | 'backup' | 'verify' | 'phone' | 'restore' | 'login' | 'setup' | 'failure';
type LabOutcome = 'success' | 'error';
type ButtonVariant = 'primary' | 'success' | 'secondary' | 'danger' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg';

type LabScenario = {
  id: LabScenarioId;
  title: string;
  description: string;
  idleText: string;
  loadingText: string;
  loadingHint?: string;
  successText?: string;
  successHint?: string;
  variant: ButtonVariant;
  size: ButtonSize;
  icon: string;
  outcome?: LabOutcome;
  fullWidth?: boolean;
  staged?: boolean;
};

type ActiveRun = {
  id: LabScenarioId;
  step: number;
};

const LAB_SCENARIOS: LabScenario[] = [
  {
    id: 'save',
    title: 'متن کوتاه',
    description: 'کنترل تغییر حالت بدون افزایش غیرضروری عرض.',
    idleText: 'ذخیره',
    loadingText: 'در حال ذخیره…',
    successText: 'ذخیره شد',
    variant: 'primary',
    size: 'sm',
    icon: 'fa-solid fa-floppy-disk',
  },
  {
    id: 'backup',
    title: 'متن بلند تطبیقی',
    description: 'عرض دکمه تا سقف فضای والد افزایش پیدا می‌کند و سپس متن داخل همان قاب می‌شکند.',
    idleText: 'تهیه نسخه پشتیبان',
    loadingText: 'در حال تهیه نسخه پشتیبان…',
    loadingHint: 'داده‌ها و تنظیمات فروشگاه در حال آماده‌سازی هستند.',
    successText: 'نسخه پشتیبان آماده شد',
    successHint: 'فایل برای دانلود آماده است.',
    variant: 'primary',
    size: 'md',
    icon: 'fa-solid fa-box-archive',
  },
  {
    id: 'verify',
    title: 'دکمه ثانویه',
    description: 'خوانایی Track و متن روی Surface روشن، تاریک و سفارشی.',
    idleText: 'بررسی فایل',
    loadingText: 'در حال بررسی فایل…',
    successText: 'فایل معتبر است',
    variant: 'secondary',
    size: 'md',
    icon: 'fa-solid fa-file-shield',
  },
  {
    id: 'phone',
    title: 'عملیات موجودی',
    description: 'نمونه دکمه افزودن گوشی با متن عملیاتی طولانی.',
    idleText: 'افزودن گوشی',
    loadingText: 'در حال افزودن گوشی به موجودی…',
    successText: 'گوشی اضافه شد',
    variant: 'success',
    size: 'md',
    icon: 'fa-solid fa-mobile-screen-button',
  },
  {
    id: 'restore',
    title: 'پیشرفت مرحله‌ای',
    description: 'چهار مرحله واقعی برای اعتبارسنجی و بازیابی نسخه پشتیبان.',
    idleText: 'بازیابی نسخه پشتیبان',
    loadingText: 'در حال اعتبارسنجی و بازیابی…',
    loadingHint: 'بررسی فایل، تهیه نسخه ایمنی، جایگزینی و بازگشایی اتصال',
    successText: 'بازیابی کامل شد',
    successHint: 'اتصال دیتابیس دوباره برقرار است.',
    variant: 'warning',
    size: 'md',
    icon: 'fa-solid fa-clock-rotate-left',
    staged: true,
  },
  {
    id: 'login',
    title: 'فرم ورود تمام‌عرض',
    description: 'عرض فرم ثابت می‌ماند و متن Loading در موبایل بریده نمی‌شود.',
    idleText: 'ورود به حساب',
    loadingText: 'در حال ورود به حساب کاربری…',
    successText: 'ورود موفق بود',
    variant: 'primary',
    size: 'lg',
    icon: 'fa-solid fa-right-to-bracket',
    fullWidth: true,
  },
  {
    id: 'setup',
    title: 'ساخت حساب اولیه',
    description: 'نمونه متن بلند فرم راه‌اندازی اولیه در عرض‌های کوچک.',
    idleText: 'ساخت حساب مدیر',
    loadingText: 'در حال ساخت حساب مدیر اولیه…',
    successText: 'حساب مدیر ساخته شد',
    variant: 'primary',
    size: 'lg',
    icon: 'fa-solid fa-user-shield',
    fullWidth: true,
  },
  {
    id: 'failure',
    title: 'بازگشت از خطا',
    description: 'Loading پایان می‌یابد و پیام خطا بیرون دکمه، در ناحیه استاندارد نمایش داده می‌شود.',
    idleText: 'بررسی خطا',
    loadingText: 'در حال اجرای عملیات کنترل‌شده…',
    loadingHint: 'این سناریو برای بررسی بازگشت امن از خطا، عمداً ناموفق تمام می‌شود.',
    variant: 'danger',
    size: 'md',
    icon: 'fa-solid fa-triangle-exclamation',
    outcome: 'error',
  },
];

const VIEWPORT_OPTIONS: Array<{ key: LabViewport; label: string; icon: string }> = [
  { key: 'mobile', label: 'موبایل', icon: 'fa-solid fa-mobile-screen' },
  { key: 'tablet', label: 'تبلت', icon: 'fa-solid fa-tablet-screen-button' },
  { key: 'desktop', label: 'دسکتاپ', icon: 'fa-solid fa-display' },
];

const THEME_OPTIONS = [
  { key: 'light' as const, label: 'روشن', icon: 'fa-solid fa-sun' },
  { key: 'dark' as const, label: 'تیره', icon: 'fa-solid fa-moon' },
  { key: 'system' as const, label: 'سیستم', icon: 'fa-solid fa-laptop' },
];

const StyleButtonLab: React.FC = () => {
  const { style, setStyle, setMany } = useStyle();
  const [viewport, setViewport] = React.useState<LabViewport>('desktop');
  const [activeRun, setActiveRun] = React.useState<ActiveRun | null>(null);
  const [failedScenario, setFailedScenario] = React.useState<LabScenarioId | null>(null);
  const timersRef = React.useRef<number[]>([]);

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current = [];
  }, []);

  React.useEffect(() => clearTimers, [clearTimers]);

  const applyPalette = (palette: StandardStylePalette) => {
    const preset = STANDARD_STYLE_PALETTES[palette];
    setMany({
      palette,
      brandMode: 'custom',
      primaryHue: preset.hue,
      primaryS: preset.saturation,
      primaryL: preset.lightness,
      buttonPreset: preset.buttonPreset,
    });
  };

  const runScenario = (scenario: LabScenario) => {
    clearTimers();
    setFailedScenario(null);
    setActiveRun({ id: scenario.id, step: scenario.staged ? 1 : 0 });

    if (scenario.staged) {
      [2, 3, 4].forEach((step, index) => {
        const timerId = window.setTimeout(() => {
          setActiveRun((current) => current?.id === scenario.id ? { id: scenario.id, step } : current);
        }, 520 * (index + 1));
        timersRef.current.push(timerId);
      });
    }

    const completionDelay = scenario.staged ? 2300 : 1650;
    const completionTimer = window.setTimeout(() => {
      setActiveRun((current) => current?.id === scenario.id ? null : current);
      if (scenario.outcome === 'error') setFailedScenario(scenario.id);
    }, completionDelay);
    timersRef.current.push(completionTimer);
  };

  const activePalette = style.palette === 'custom' ? null : style.palette;

  return (
    <div className="style-button-lab" data-ui-style-button-lab="true">
      <div className="style-button-lab__toolbar">
        <div className="style-button-lab__control" role="group" aria-label="عرض پیش‌نمایش دکمه‌ها">
          <span>عرض پیش‌نمایش</span>
          <div className="style-button-lab__choices">
            {VIEWPORT_OPTIONS.map((option) => (
              <Button
                key={option.key}
                type="button"
                size="sm"
                variant={viewport === option.key ? 'primary' : 'secondary'}
                aria-pressed={viewport === option.key}
                onClick={() => setViewport(option.key)}
                leftIcon={<i className={option.icon} aria-hidden="true" />}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="style-button-lab__control" role="group" aria-label="حالت نمایش بررسی دکمه‌ها">
          <span>حالت نمایش</span>
          <div className="style-button-lab__choices">
            {THEME_OPTIONS.map((option) => (
              <Button
                key={option.key}
                type="button"
                size="sm"
                variant={style.theme === option.key ? 'primary' : 'secondary'}
                aria-pressed={style.theme === option.key}
                onClick={() => setStyle('theme', option.key)}
                leftIcon={<i className={option.icon} aria-hidden="true" />}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="style-button-lab__palette-control" role="group" aria-label="پالت بررسی دکمه‌ها">
        <span>پالت بررسی</span>
        <div className="style-button-lab__palette-grid">
          {STANDARD_STYLE_PALETTE_KEYS.map((palette) => (
            <Button
              key={palette}
              type="button"
              size="sm"
              variant={activePalette === palette ? 'primary' : 'secondary'}
              aria-pressed={activePalette === palette}
              onClick={() => applyPalette(palette)}
              data-button-lab-palette={palette}
              leftIcon={<span className="style-button-lab__palette-swatch" aria-hidden="true" />}
            >
              {STANDARD_STYLE_PALETTES[palette].label}
            </Button>
          ))}
        </div>
      </div>

      <div className="style-button-lab__viewport-shell" data-button-lab-viewport={viewport}>
        <div className="style-button-lab__viewport-head">
          <span><i className="fa-solid fa-ruler-combined" aria-hidden="true" /> پیش‌نمایش {VIEWPORT_OPTIONS.find((item) => item.key === viewport)?.label}</span>
          <small>هر دکمه را بزن تا Loading، پیشرفت و پایان عملیات را ببینی.</small>
        </div>

        <div className="style-button-lab__grid">
          {LAB_SCENARIOS.map((scenario) => {
            const isRunning = activeRun?.id === scenario.id;
            const isFailed = failedScenario === scenario.id;
            const isSuccessfulScenario = scenario.outcome !== 'error';
            return (
              <article key={scenario.id} className="style-button-lab__case" data-full-width={scenario.fullWidth ? 'true' : undefined}>
                <header>
                  <strong>{scenario.title}</strong>
                  <small>{scenario.description}</small>
                </header>
                <div className="style-button-lab__button-row">
                  <Button
                    type="button"
                    variant={scenario.variant}
                    size={scenario.size}
                    loading={isRunning}
                    disabled={Boolean(activeRun && activeRun.id !== scenario.id)}
                    loadingText={scenario.loadingText}
                    loadingHint={scenario.loadingHint}
                    loadingStageStep={scenario.staged && isRunning ? activeRun?.step : undefined}
                    loadingStageTotal={scenario.staged ? 4 : undefined}
                    successPulseText={isSuccessfulScenario ? scenario.successText : undefined}
                    successPulseHint={isSuccessfulScenario ? scenario.successHint : undefined}
                    successPulseDuration={1500}
                    className={scenario.fullWidth ? 'style-button-lab__full-button' : undefined}
                    onClick={() => runScenario(scenario)}
                    leftIcon={<i className={scenario.icon} aria-hidden="true" />}
                  >
                    {isFailed ? 'تلاش دوباره' : scenario.idleText}
                  </Button>
                </div>
                {isFailed ? (
                  <p className="style-button-lab__error" role="alert">
                    <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                    خطای کنترل‌شده ثبت شد؛ دکمه به حالت قابل‌استفاده برگشته است.
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>

      <LoadingButtonVisualReportPanel />
      <DashboardVisualReportPanel />
      <PwaPlatformInstallReportPanel />
    </div>
  );
};

export default StyleButtonLab;
