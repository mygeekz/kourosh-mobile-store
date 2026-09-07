import React from 'react';

import AuthBrandLogo from './AuthBrandLogo';
import OrbBackdrop from '../OrbBackdrop';
import TrueFocusText from '../TrueFocusText';
import VariableProximityText from '../VariableProximityText';
import logoUrl from '../assets/kourosh-final-symbol-gold.svg';
import { cn } from '../../utils/cn';
import { Surface } from '@/components/ui';

type AuthPageShellProps = {
  children: React.ReactNode;
  title: string;
  description: string;
  storeName?: string;
  eyebrow?: React.ReactNode;
  footer?: React.ReactNode;
  panelSize?: 'md' | 'lg';
  variant?: 'standard' | 'liquid';
  liquidLayout?: 'default' | 'compact';
  liquidAppearance?: 'animated' | 'install' | 'setup';
};

const benefits = [
  ['fa-shield-halved', 'دسترسی کنترل‌شده', 'ورود امن و مدیریت سطح دسترسی کاربران'],
  ['fa-chart-line', 'تصمیم‌گیری دقیق', 'داده‌های فروش، مالی و عملیات در یک فضای یکپارچه'],
  ['fa-wand-magic-sparkles', 'دستیار هوشمند', 'تحلیل‌های پیشنهادی بدون تصمیم‌گیری خودکار'],
] as const;


type AuthInsetPanelProps = Omit<React.ComponentProps<typeof Surface>, 'surface' | 'scheme'>;

/**
 * Shared dark inset surface for authentication flows.
 * The visual contract lives in React/Tailwind utilities so auth pages never
 * require page-level CSS patches or depend on the application's active theme.
 */
export const AuthInsetPanel: React.FC<AuthInsetPanelProps> = ({
  className,
  contentClassName,
  children,
  variant = 'subtle',
  ...props
}) => (
  <Surface
    {...props}
    surface="glass"
    scheme="dark"
    variant={variant}
    className={cn(
      'rounded-[24px] border border-white/15 bg-slate-950/70 text-white shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95)] backdrop-blur-xl [&>span]:opacity-40',
      className,
    )}
    contentClassName={cn('text-white', contentClassName)}
  >
    {children}
  </Surface>
);

const LiquidAuthShell: React.FC<AuthPageShellProps> = ({
  children,
  title,
  description,
  storeName = 'فروشگاه کوروش',
  eyebrow,
  footer,
  panelSize = 'md',
  liquidLayout = 'default',
  liquidAppearance = 'animated',
}) => {
  const compact = liquidLayout === 'compact';
  const installAppearance = liquidAppearance === 'install';
  const setupAppearance = liquidAppearance === 'setup';
  const staticDarkAppearance = installAppearance || setupAppearance;

  return (
    <div
      dir="rtl"
      data-ui-auth-appearance={liquidAppearance}
      className="login-page auth-liquid-shell relative min-h-screen min-h-[100svh] overflow-x-hidden bg-[radial-gradient(1100px_700px_at_20%_-10%,#1a0f12_0%,#0c0b11_42%,#07070a_100%)] text-right text-white"
    >
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,154,156,0.08),transparent_16%),radial-gradient(circle_at_84%_14%,rgba(255,255,255,0.04),transparent_20%),radial-gradient(circle_at_72%_84%,rgba(255,255,255,0.04),transparent_18%)]"
        aria-hidden="true"
      />
      {staticDarkAppearance ? (
        <div
          className={cn(
            'pointer-events-none fixed inset-0',
            setupAppearance
              ? 'bg-[radial-gradient(circle_at_50%_-18%,rgba(198,164,104,0.10),transparent_32%),linear-gradient(180deg,rgba(7,8,14,0.42),rgba(2,3,8,0.92))]'
              : 'bg-[radial-gradient(circle_at_50%_-12%,rgba(99,102,241,0.13),transparent_30%),linear-gradient(180deg,rgba(7,8,14,0.1),rgba(2,3,8,0.72))]',
          )}
          aria-hidden="true"
        />
      ) : (
        <OrbBackdrop
          sizeVmin={compact ? 104 : 128}
          x="50%"
          y={compact ? '35%' : '48%'}
          className={compact ? 'opacity-30 sm:opacity-50' : ''}
          hoverGlobal
        />
      )}
      {compact && !staticDarkAppearance ? (
        <div className="pointer-events-none fixed inset-0 bg-slate-950/[0.46]" aria-hidden="true" />
      ) : null}

      <main
        className={cn(
          'relative z-10 flex min-h-screen min-h-[100svh] items-start justify-center overflow-y-auto px-3',
          compact
            ? installAppearance
              ? 'py-2.5 pb-[max(20px,env(safe-area-inset-bottom))] sm:items-center sm:px-4 sm:py-5'
              : 'py-2.5 pb-[max(12px,env(safe-area-inset-bottom))] sm:items-center sm:px-4 sm:py-6'
            : 'py-4 sm:px-4 sm:py-7 [@media(max-height:820px)]:py-3 [@media(max-height:700px)]:py-2',
        )}
      >
        <Surface
          surface="glass"
          scheme="dark"
          variant={staticDarkAppearance ? 'auth' : compact ? 'modal' : 'panel'}
          className={cn(
            'my-auto w-full text-white',
            compact
              ? installAppearance
                ? 'max-w-[560px] rounded-[28px] px-3 pb-3.5 pt-3 sm:rounded-[30px] sm:px-5 sm:pb-5 sm:pt-4'
                : 'max-w-[540px] rounded-[28px] px-3.5 pb-4 pt-3 sm:rounded-[32px] sm:px-6 sm:pb-6 sm:pt-4'
              : 'rounded-[34px] px-5 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-5 [@media(max-height:820px)]:px-5 [@media(max-height:820px)]:pb-5 [@media(max-height:820px)]:pt-3.5 [@media(max-height:700px)]:rounded-[28px] [@media(max-height:700px)]:px-4 [@media(max-height:700px)]:pb-3.5 [@media(max-height:700px)]:pt-2.5',
            !compact && (panelSize === 'lg' ? 'max-w-xl' : 'max-w-[430px]'),
          )}
          contentClassName={cn(
            compact
              ? installAppearance
                ? 'space-y-2.5 sm:space-y-3.5'
                : 'space-y-3 sm:space-y-4'
              : 'space-y-4 sm:space-y-[18px] [@media(max-height:820px)]:space-y-3.5 [@media(max-height:700px)]:space-y-2.5',
          )}
        >
          <header className="text-center">
            <div className="mx-auto w-fit max-w-full">
              <AuthBrandLogo
                animated={!installAppearance}
                size={installAppearance ? 'install' : compact ? 'compact' : 'default'}
              />
            </div>

            {eyebrow && !installAppearance ? (
              <div
                className={cn(
                  'mx-auto flex w-fit max-w-full items-center justify-center gap-2 text-center font-black tracking-[0.025em] text-[#bda16f]',
                  '[&_i]:text-[#c8ab76] [&_i]:drop-shadow-[0_0_10px_rgba(205,176,124,0.14)]',
                  compact ? 'mt-0.5 text-[10px] sm:mt-1 sm:text-[11px]' : 'mt-1 text-[11px] sm:text-xs [@media(max-height:820px)]:mt-0.5 [@media(max-height:700px)]:text-[10px]',
                )}
              >
                {eyebrow}
              </div>
            ) : null}

            {compact ? (
              <>
                <h1 className={cn('font-black', installAppearance ? 'mt-0.5 text-lg leading-7 text-[#dcc08c] drop-shadow-[0_8px_20px_rgba(196,164,107,0.10)] sm:mt-1 sm:text-xl' : 'mt-1 text-xl leading-8 text-[#d9bd89] drop-shadow-[0_8px_22px_rgba(196,164,107,0.10)] sm:mt-2 sm:text-2xl')}>{title}</h1>
                <p className={cn('mx-auto max-w-md font-medium', installAppearance ? 'mt-1 text-[11px] leading-5 text-[#c7b18b]/80 sm:text-xs sm:leading-6' : 'mt-1.5 text-xs leading-6 text-[#c7b18b]/80 sm:mt-2 sm:text-sm sm:leading-7')}>
                  {description}
                </p>
              </>
            ) : (
              <>
                <div className="mt-3 [@media(max-height:820px)]:mt-2 [@media(max-height:700px)]:mt-1">
                  <TrueFocusText
                    text={title}
                    className="block text-[24px] font-black leading-tight text-[#d9bd89] drop-shadow-[0_10px_26px_rgba(196,164,107,0.10)] sm:text-[28px] [@media(max-height:820px)]:text-[23px] [@media(max-height:700px)]:text-[21px]"
                    boxSize={108}
                    radius={64}
                    color="#e4c78f"
                    corner={12}
                    thickness={2}
                    blur={2.2}
                    dim={0.34}
                    autoCycle
                    cycleHoldMs={1000}
                    cycleAnimMs={420}
                    pauseOnHover
                    lockAxis="x"
                  />
                </div>
                <div className="mt-4 sm:mt-6 [@media(max-height:820px)]:mt-3 [@media(max-height:700px)]:mt-2">
                  <VariableProximityText
                    text={description}
                    className="text-sm font-medium text-[#c7b18b]/80 [@media(max-height:700px)]:text-[13px]"
                    mode="word"
                    radius={140}
                    maxScale={1.05}
                    minWght={320}
                    maxWght={820}
                    fallbackWeight
                  />
                </div>
              </>
            )}
          </header>

          <div
            className={cn(
              'w-full min-w-0 [--ux-btn-radius:9999px]',
              compact
                ? '[--ux-btn-h-lg:52px] sm:[--ux-btn-h-lg:56px]'
                : '[--ux-btn-h-lg:64px] [@media(max-height:820px)]:[--ux-btn-h-lg:56px] [@media(max-height:700px)]:[--ux-btn-h-lg:50px]',
            )}
          >
            {children}
          </div>

          {footer ? (
            <footer
              className={cn(
                'text-center font-bold transition-colors duration-200',
                installAppearance ? 'text-[#a98a64]/70' : 'text-[#a98a64]/70',
                compact ? 'text-[10px] leading-5 sm:text-[11px]' : 'text-[11px] [@media(max-height:700px)]:text-[10px] [@media(max-height:700px)]:leading-4',
              )}
            >
              {footer}
            </footer>
          ) : null}
          {!footer ? <p className="text-center text-[11px] font-bold text-white/[0.68]">{storeName}</p> : null}
        </Surface>
      </main>
    </div>
  );
};

export const AuthPageShell: React.FC<AuthPageShellProps> = ({
  children,
  title,
  description,
  storeName = 'فروشگاه کوروش',
  eyebrow,
  footer,
  panelSize = 'md',
  variant = 'standard',
  liquidLayout = 'default',
  liquidAppearance = 'animated',
}) => {
  if (variant === 'liquid') {
    return (
      <LiquidAuthShell
        title={title}
        description={description}
        storeName={storeName}
        footer={footer}
        panelSize={panelSize}
        eyebrow={eyebrow}
        variant={variant}
        liquidLayout={liquidLayout}
        liquidAppearance={liquidAppearance}
      >
        {children}
      </LiquidAuthShell>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen min-h-[100svh] bg-slate-100 text-slate-950 dark:bg-slate-950 dark:text-slate-50"
    >
      <main className="mx-auto grid min-h-screen min-h-[100svh] w-full max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_minmax(25rem,32rem)]">
        <section className="flex min-w-0 items-center justify-center px-3 py-4 sm:px-6 sm:py-8 lg:px-10 lg:py-12">
          <div className={cn('w-full', panelSize === 'lg' ? 'max-w-xl' : 'max-w-md')}>
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900">
              <header className="mb-6">
                <div className="mb-5 flex items-center justify-between gap-4 lg:hidden">
                  <img src={logoUrl} alt="" className="h-auto w-32 max-w-[46vw]" aria-hidden="true" />
                  <span className="max-w-[46%] truncate text-xs font-black text-slate-500 dark:text-slate-400">
                    {storeName}
                  </span>
                </div>
                {eyebrow ? (
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {eyebrow}
                  </div>
                ) : null}
                <h1 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl dark:text-white">{title}</h1>
                <p className="mt-3 max-w-prose text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
                  {description}
                </p>
              </header>

              {children}

              {footer ? (
                <footer className="mt-6 border-t border-slate-200 pt-5 text-center text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {footer}
                </footer>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="relative hidden min-w-0 overflow-hidden border-r border-slate-800 bg-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-slate-800" aria-hidden="true" />
          <div className="absolute -bottom-36 -right-36 h-96 w-96 rounded-full border-[52px] border-slate-800/70" aria-hidden="true" />

          <div className="relative">
            <img src={logoUrl} alt="نشان سامانه" className="h-auto w-52 max-w-full" />
            <p className="mt-5 text-sm font-black text-slate-300">{storeName}</p>
          </div>

          <div className="relative my-12">
            <p className="text-xs font-black tracking-[0.18em] text-slate-400">سامانه یکپارچه مدیریت فروشگاه</p>
            <h2 className="mt-4 max-w-lg text-3xl font-black leading-[1.55] xl:text-4xl">
              محیطی آرام، دقیق و قابل اعتماد برای مدیریت روزانه
            </h2>
            <div className="mt-9 space-y-5">
              {benefits.map(([icon, label, text]) => (
                <div key={label} className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-700 bg-slate-800 text-slate-200">
                    <i className={`fa-solid ${icon}`} aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black">{label}</h3>
                    <p className="mt-1 text-xs font-medium leading-6 text-slate-400">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs font-bold text-slate-500">طراحی‌شده برای استفاده امن در شبکه داخلی فروشگاه</p>
        </aside>
      </main>
    </div>
  );
};

type AuthStatusScreenProps = {
  title: string;
  message?: string;
  icon?: string;
  tone?: 'neutral' | 'warning';
  action?: React.ReactNode;
};

export const AuthStatusScreen: React.FC<AuthStatusScreenProps> = ({
  title,
  message,
  icon = 'fa-circle-notch fa-spin',
  tone = 'neutral',
  action,
}) => (
  <div
    dir="rtl"
    className="login-page auth-liquid-shell relative flex min-h-screen min-h-[100svh] items-center justify-center overflow-hidden bg-[radial-gradient(1100px_700px_at_20%_-10%,#1a0f12_0%,#0c0b11_42%,#07070a_100%)] px-3 py-5 text-white sm:px-4 sm:py-8"
  >
    <div
      className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,154,156,0.06),transparent_16%),radial-gradient(circle_at_84%_14%,rgba(255,255,255,0.03),transparent_20%),radial-gradient(circle_at_72%_84%,rgba(169,138,100,0.055),transparent_18%)]"
      aria-hidden="true"
    />
    <OrbBackdrop
      sizeVmin={112}
      x="50%"
      y="48%"
      className="opacity-35 sm:opacity-50"
      hoverGlobal
    />

    <Surface
      surface="glass"
      scheme="dark"
      variant="auth"
      role="status"
      aria-live="polite"
      data-ui-auth-surface="status-screen"
      className="relative z-10 w-full max-w-[460px] rounded-[28px] border-[#c7a86f]/[0.18] px-4 pb-5 pt-3.5 text-center text-white shadow-[0_42px_110px_-40px_rgba(0,0,0,0.96),0_18px_44px_-30px_rgba(17,14,34,0.72),inset_0_1px_0_rgba(255,244,217,0.08)] sm:rounded-[32px] sm:px-7 sm:pb-7 sm:pt-5"
      contentClassName="space-y-0"
    >
      <AuthBrandLogo animated size="compact" />

      <div className="mt-1 flex items-center justify-center gap-2.5 text-[#c9ad79]">
        <i
          className={cn(
            `fa-solid ${icon} text-[17px] drop-shadow-[0_0_12px_rgba(213,180,122,0.18)]`,
            tone === 'warning' ? 'text-[#d8bd8b]' : 'text-[#c9ad79]',
          )}
          aria-hidden="true"
        />
        <span className="text-[10px] font-black tracking-[0.045em] text-[#a98a64] sm:text-[11px]">
          {tone === 'warning' ? 'نیازمند توجه' : 'وضعیت سامانه'}
        </span>
      </div>

      <h1 className="mt-4 text-xl font-black leading-8 text-[#ddc08a] drop-shadow-[0_8px_20px_rgba(196,164,107,0.10)] sm:text-2xl">
        {title}
      </h1>
      {message ? (
        <p className="mx-auto mt-3 max-w-sm text-sm font-medium leading-7 text-[#c7b18b]/80">
          {message}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </Surface>
  </div>
);

export default AuthPageShell;
