import React, { useEffect, useState } from 'react';

import Button from './Button';
import AuthBrandLogo from './auth/AuthBrandLogo';
import { Surface } from '@/components/ui';
import usePwaInstall from '../hooks/usePwaInstall';

const DISMISS_KEY = 'pwa_install_overlay_dismissed_v2';

const PwaInstallOverlay: React.FC = () => {
  const {
    installed,
    installationChecked,
    platform,
    installReady,
    ios,
    inAppBrowser,
    diagnostics,
    requestInstall,
  } = usePwaInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (installReady) {
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {
        // Local storage is optional.
      }
      setDismissed(false);
    }
  }, [installReady]);

  const iosReady = Boolean(
    ios &&
    diagnostics?.productionRuntime &&
    diagnostics?.secureContext &&
    diagnostics?.manifestInstallable,
  );
  const shouldShow = installationChecked && !installed && !dismissed && (installReady || iosReady);
  if (!shouldShow) return null;

  const onDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Local storage is optional.
    }
  };

  const onInstall = async () => {
    setMessage(null);
    if (inAppBrowser) {
      setMessage('این صفحه داخل مرورگر داخلی باز شده است. آن را با Chrome یا Safari باز کنید.');
      return;
    }

    try {
      const outcome = await requestInstall();
      if (outcome === 'ios-help') {
        setShowIOSHelp(true);
        return;
      }
      if (outcome === 'accepted' || outcome === 'already-installed') {
        onDismiss();
      } else if (outcome === 'dismissed') {
        setMessage('نصب لغو شد؛ هر زمان آماده بودید دوباره از صفحه نصب اقدام کنید.');
      } else {
        setMessage('مرورگر هنوز نصب مستقیم را آماده نکرده است. جزئیات را در صفحه نصب بررسی کنید.');
      }
    } catch {
      setMessage('پنجره نصب باز نشد. صفحه را یک‌بار تازه‌سازی کنید و دوباره تلاش کنید.');
    }
  };

  return (
    <div
      dir="rtl"
      data-kourosh-layer="modal-backdrop"
      className="login-page auth-liquid-shell fixed inset-0 flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
    >
      <Surface
        surface="glass"
        scheme="dark"
        variant="auth"
        data-ui-auth-surface="pwa-install-overlay"
        className="max-h-[92svh] w-full overflow-y-auto rounded-t-[28px] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 text-white sm:max-w-[460px] sm:rounded-[32px] sm:px-6 sm:pb-6 sm:pt-4"
        contentClassName="space-y-4 text-white sm:space-y-5"
      >
        <div className="mx-auto h-1.5 w-12 rounded-full bg-white/20 sm:hidden" aria-hidden="true" />

        <header className="text-center">
          <div className="mx-auto w-fit max-w-full">
            <AuthBrandLogo animated={false} size="install" />
          </div>
          <p className="mt-1 text-[11px] font-black tracking-[0.14em] text-white/45">KOUROSH LOCAL PWA</p>
          <h2 id="pwa-install-title" className="mt-2 text-xl font-black text-white sm:text-2xl">نصب برنامه کوروش</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-xs font-medium leading-6 text-white/65 sm:mt-2 sm:text-sm sm:leading-7">
            {platform.installDescription} دسترسی به فروشگاه سریع‌تر و یکپارچه‌تر می‌شود.
          </p>
        </header>

        <div className="border-y border-white/10 py-3 sm:py-4">
          <div className="flex items-start gap-3">
            <i className={`${platform.iconClass} mt-1 text-lg text-white/80`} aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-black text-white">{ios ? 'آماده افزودن به صفحه اصلی' : `آماده نصب روی ${platform.label}`}</p>
              <p className="mt-1 text-xs font-medium leading-6 text-white/55">
                {ios
                  ? 'در iPhone و iPad نصب از منوی Share انجام می‌شود.'
                  : 'Chrome شرایط نصب را تأیید کرده و پنجره رسمی نصب آماده است.'}
              </p>
            </div>
          </div>
        </div>

        {message ? (
          <div className="border-r-2 border-amber-300/70 pr-3 text-sm font-medium leading-7 text-amber-100">
            {message}
          </div>
        ) : null}

        {showIOSHelp ? (
          <div className="space-y-2 text-sm font-medium leading-7 text-white/70">
            <p className="font-black text-white">نصب در iPhone / iPad</p>
            <p>۱. دکمه Share را بزنید.</p>
            <p>۲. گزینه Add to Home Screen را انتخاب کنید.</p>
            <p>۳. در پایان Add را بزنید.</p>
          </div>
        ) : null}

        <div className="grid gap-2.5">
          <Button
            type="button"
            size="lg"
            className="w-full"
            onClick={onInstall}
            rightIcon={<i className="fa-solid fa-download" aria-hidden="true" />}
          >
            {ios ? 'نمایش راهنمای نصب' : platform.installLabel}
          </Button>
          <a
            href="#/install"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[18px] border border-white/15 bg-white/[0.06] px-4 py-3 text-center text-sm font-black text-white/85 transition hover:bg-white/[0.1]"
          >
            <i className="fa-solid fa-shield-halved" aria-hidden="true" />
            بررسی وضعیت نصب و اتصال
          </a>
          <Button
            type="button"
            unstyled
            autoIcon={false}
            onClick={onDismiss}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-white/60 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white/85"
          >
            فعلاً ادامه در مرورگر
          </Button>
        </div>
      </Surface>
    </div>
  );
};

export default PwaInstallOverlay;
