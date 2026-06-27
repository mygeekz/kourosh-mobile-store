import React, { useEffect, useMemo, useState } from 'react';
import Button from './Button';
import Modal from './Modal';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone(): boolean {
  // Android/desktop
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  // iOS Safari
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navAny = navigator as any;
  if (typeof navAny.standalone === 'boolean' && navAny.standalone) return true;
  return false;
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isInAppBrowser(): boolean {
  // Instagram/Telegram/WhatsApp in-app browsers sometimes block install prompts.
  const ua = window.navigator.userAgent.toLowerCase();
  return /instagram|fbav|fb_iab|fban|line|snapchat|telegram|whatsapp/.test(ua);
}

const DISMISS_KEY = 'pwa_install_overlay_dismissed_v1';

const PwaInstallOverlay: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const ios = useMemo(() => isIOS(), []);
  const inApp = useMemo(() => isInAppBrowser(), []);

  useEffect(() => {
    const onBip = (e: Event) => {
      // This only fires when Chrome considers the site installable.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBip);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Re-check standalone on visibility change (some browsers update late)
  useEffect(() => {
    const handler = () => setInstalled(isStandalone());
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, []);

  const shouldShow = !installed && !dismissed;

  const canShowCTA = ios || deferredPrompt;

  if (!shouldShow) return null;

  const onDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  const onInstallClick = async () => {
    setLastError(null);
    if (inApp) {
      setLastError('این صفحه داخل مرورگر داخلی (مثل اینستاگرام/تلگرام) باز شده. لطفاً با Chrome یا Safari باز کنید.');
      return;
    }

    if (ios) {
      setShowIOSHelp(true);
      return;
    }

    if (!deferredPrompt) {
      // Most common cause in local networks: HTTPS not trusted / SW not allowed.
      setLastError('مرورگر هنوز اجازه نصب نداده. معمولاً علت: HTTPS معتبر نیست یا سرویس‌ورکر فعال نشده.');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDismissed(true);
        try {
          localStorage.setItem(DISMISS_KEY, '1');
        } catch {
          // ignore
        }
      }
      setDeferredPrompt(null);
    } catch (err) {
      setLastError('خطا در نمایش پنجره نصب. یک بار صفحه را رفرش کنید و دوباره تلاش کنید.');
    }
  };

  return (
    <Modal
      isOpen={shouldShow}
      onClose={onDismiss}
      title="نصب برنامه"
      variant="compact"
      size="md"
      layout="horizontal"
      tone={inApp || lastError ? 'warning' : 'info'}
      iconClass="fa-solid fa-download"
      kicker="دسترسی سریع"
      ariaDescription="برای تجربه بهتر، برنامه را روی موبایل نصب کنید تا مثل اپلیکیشن مستقل اجرا شود."
      wrapperClassName="pwa-install-overlay"
      bodyClassName="pwa-install-overlay__body"
    >
      <div className="app-modal-alert app-modal-alert--horizontal" data-modal-alert-tone={inApp || lastError ? 'warning' : 'info'}>
        <span className="app-modal-alert__icon" aria-hidden="true"><i className="fa-solid fa-mobile-screen-button" /></span>
        <div className="app-modal-alert__content">
          <p className="app-modal-alert__title">برنامه را روی دستگاه نصب کنید.</p>
          <p className="app-modal-alert__text">برای تجربه بهتر، برنامه را روی موبایل نصب کنید تا مثل اپلیکیشن مستقل اجرا شود.</p>
          <div className="app-modal-alert__summaryGrid">
            <div className="app-modal-alert__summaryItem">
              <div className="app-modal-alert__summaryLabel">وضعیت نصب</div>
              <div className="app-modal-alert__summaryValue">
                {ios
                  ? 'iPhone/iPad: از Add to Home Screen استفاده کنید.'
                  : deferredPrompt
                    ? 'Android/Chrome: آماده نصب است.'
                    : 'Android/Chrome: هنوز شرایط نصب فراهم نیست.'}
              </div>
            </div>
          </div>
          {inApp && (
            <p className="app-modal-alert__text text-amber-700 dark:text-amber-300">
              این صفحه داخل مرورگر داخلی باز شده و ممکن است نصب فعال نشود.
            </p>
          )}
        </div>
      </div>

      {lastError && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
          {lastError}
        </div>
      )}

      {showIOSHelp && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-blue-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
          <div className="font-semibold mb-1">نصب روی iPhone/iPad</div>
          1) دکمه Share (⤴︎) را بزنید
          <br />
          2) گزینه <b>Add to Home Screen</b> را انتخاب کنید
          <br />
          3) Add را بزنید
        </div>
      )}

      <div className="modal-actions premium-modal-actions app-modal-actions pwa-install-overlay__actions">
        <div className="app-modal-command-row flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-end">
          <a
            href="#/login"
            className="modal-btn app-command-button app-command-button--cancel premium-cancel-btn inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <i className="fa-solid fa-globe" aria-hidden="true" />
            ادامه در مرورگر
          </a>
          <Button
            type="button"
            onClick={onInstallClick}
            variant={canShowCTA ? 'primary' : 'secondary'}
            disabled={!canShowCTA}
            leftIcon={<i className="fa-solid fa-download" aria-hidden="true" />}
          >
            نصب برنامه
          </Button>
        </div>
      </div>

      {!deferredPrompt && !ios && (
        <div className="mt-3 text-xs leading-6 text-gray-500 dark:text-slate-500">
          اگر گزینه نصب ظاهر نمی‌شود، معمولاً دلیلش این است که اتصال HTTPS «امن» تشخیص داده نشده یا سرویس‌ورکر فعال نشده.
        </div>
      )}
    </Modal>
  );
};

export default PwaInstallOverlay;
