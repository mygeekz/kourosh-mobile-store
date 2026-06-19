import React, { useEffect, useMemo, useState } from 'react';
import Button from '../components/Button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone(): boolean {
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navAny = navigator as any;
  return !!navAny.standalone;
}

function isIOS(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isInAppBrowser(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  return /instagram|fbav|fb_iab|fban|line|snapchat|telegram|whatsapp/.test(ua);
}

const InstallApp: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const ios = useMemo(() => isIOS(), []);
  const inApp = useMemo(() => isInAppBrowser(), []);

  useEffect(() => {
    const onBip = (e: Event) => {
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
      setLastError('مرورگر هنوز اجازه نصب نداده. معمولاً علت: HTTPS معتبر نیست یا سرویس‌ورکر فعال نشده.');
      return;
    }

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } catch {
      setLastError('خطا در نمایش پنجره نصب. یک بار صفحه را رفرش کنید و دوباره تلاش کنید.');
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 bg-gradient-to-b from-slate-950 to-slate-900 text-white">
      <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur border border-white/10 shadow-2xl p-6">
        <div className="text-xl font-extrabold">نصب برنامه</div>
        <div className="mt-2 text-sm text-white/80 leading-6">
          برنامه را نصب کنید تا مثل یک اپلیکیشن مستقل اجرا شود و آفلاین هم سریع‌تر بالا بیاید.
        </div>

        <div className="mt-4 rounded-xl bg-black/20 border border-white/10 p-4 text-sm">
          {installed ? (
            <div>✅ این دستگاه در حالت نصب‌شده (Standalone) است.</div>
          ) : ios ? (
            <div>iPhone/iPad: از Share → Add to Home Screen نصب می‌شود.</div>
          ) : deferredPrompt ? (
            <div>Android/Chrome: آماده نصب است.</div>
          ) : (
            <div>Android/Chrome: هنوز شرایط نصب فراهم نیست.</div>
          )}
          {inApp && <div className="mt-2 text-xs text-amber-300">در مرورگر داخلی ممکن است نصب فعال نشود.</div>}
        </div>

        {lastError && (
          <div className="mt-4 rounded-xl border border-red-300/30 bg-red-500/10 p-3 text-sm text-red-100">
            {lastError}
          </div>
        )}

        {showIOSHelp && (
          <div className="mt-4 rounded-xl border border-blue-300/30 bg-blue-500/10 p-4 text-sm text-blue-100 leading-7">
            <div className="font-semibold mb-1">نصب روی iPhone/iPad</div>
            1) دکمه Share (⤴︎) را بزنید
            <br />
            2) گزینه <b>Add to Home Screen</b> را انتخاب کنید
            <br />
            3) Add را بزنید
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            onClick={onInstallClick}
            variant={ios || deferredPrompt ? 'primary' : 'secondary'}
            className="w-full"
            disabled={!(ios || deferredPrompt)}
            leftIcon={<i className="fa-solid fa-download" />}
          >
            نصب برنامه
          </Button>
          <a
            href="#/login"
            className="w-full rounded-xl px-4 py-3 text-center font-semibold bg-white/10 hover:bg-white/15 border border-white/10 inline-flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-globe" />
            ادامه در مرورگر
          </a>
        </div>
        {!deferredPrompt && !ios && !installed && (
          <div className="mt-3 text-xs text-white/70 leading-6">
            اگر گزینه نصب فعال نمی‌شود، معمولاً اتصال HTTPS «امن» تشخیص داده نشده (گواهی مورد اعتماد نیست) یا سرویس‌ورکر فعال نشده.
          </div>
        )}
      </div>
    </div>
  );
};

export default InstallApp;
