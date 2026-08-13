import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

import AuthPageShell, { AuthInsetPanel } from '../components/auth/AuthPageShell';
import Button from '../components/Button';
import {
  authGoldMutedTextClasses,
  authGoldPanelClasses,
  authGoldPrimaryActionClasses,
  authGoldSecondaryActionClasses,
  authGoldTitleTextClasses,
} from '../components/auth/authGoldControlTheme';
import { cn } from '../utils/cn';
import useLocalConnectionHealth from '../hooks/useLocalConnectionHealth';
import usePwaInstall from '../hooks/usePwaInstall';

const statusIcon = (ok: boolean) => ok ? 'fa-circle-check' : 'fa-circle-exclamation';

const InstallApp: React.FC = () => {
  const { health: connectionHealth, refresh: refreshConnectionHealth } = useLocalConnectionHealth();
  const {
    installed,
    installationChecked,
    platform,
    installReady,
    ios,
    inAppBrowser,
    diagnostics,
    checking,
    refreshDiagnostics,
    prepareServiceWorker,
    requestInstall,
  } = usePwaInstall();
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [addressCopied, setAddressCopied] = useState(false);
  const rootCaDownloadUrl = '/api/local-runtime/root-ca.crt';

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshDiagnostics(), 900);
    return () => window.clearTimeout(timer);
  }, [refreshDiagnostics]);

  useEffect(() => {
    const timer = window.setInterval(() => void refreshDiagnostics(), 8000);
    return () => window.clearInterval(timer);
  }, [refreshDiagnostics]);

  const coreReady = Boolean(
    diagnostics?.productionRuntime &&
    diagnostics?.secureContext &&
    diagnostics?.manifestInstallable,
  );
  const workerReady = Boolean(
    diagnostics?.serviceWorkerActive &&
    diagnostics?.serviceWorkerControlling &&
    !diagnostics?.serviceWorkerError,
  );
  const connectionCoreReady = Boolean(
    connectionHealth.runtimeReachable
    && connectionHealth.apiReachable
    && connectionHealth.secure
    && connectionHealth.shareable,
  );
  const qrReady = Boolean(
    platform.family === 'desktop'
    && connectionHealth.hostDevice
    && connectionCoreReady
    && connectionHealth.setupRequired === false
    && connectionHealth.qrUrl,
  );

  const copyPublicAddress = async () => {
    if (!connectionHealth.publicUrl) return;
    try {
      await navigator.clipboard.writeText(connectionHealth.publicUrl);
    } catch {
      const input = document.createElement('textarea');
      input.value = connectionHealth.publicUrl;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setAddressCopied(true);
    window.setTimeout(() => setAddressCopied(false), 1800);
  };

  const readinessLabel = useMemo(() => {
    if (!installationChecked) return `در حال بررسی وضعیت نصب روی ${platform.label}…`;
    if (installed) return `برنامه روی ${platform.label} نصب شده است.`;
    if (inAppBrowser) return 'صفحه داخل پنجرهٔ موقت مرورگر باز شده است؛ برای نصب باید آن را در تب اصلی Chrome باز کنید.';
    if (installReady) return 'همه شرایط آماده است؛ پنجره رسمی نصب قابل نمایش است.';
    if (diagnostics && !diagnostics.productionRuntime) return 'Runtime تولیدی PWA فعال نیست.';
    if (diagnostics && !diagnostics.secureContext) return 'مرورگر این اتصال را امن تشخیص نداده است.';
    if (diagnostics && !diagnostics.manifestInstallable) return 'Manifest یا آیکون‌های نصب کامل بارگذاری نشده‌اند.';
    if (diagnostics?.serviceWorkerError) return diagnostics.serviceWorkerError;
    if (!workerReady) return 'سرویس‌ورکر در حال آماده‌سازی و گرفتن کنترل صفحه است.';
    return 'شرایط فنی کامل است؛ Chrome در حال آماده‌کردن مجوز نصب است.';
  }, [diagnostics, inAppBrowser, installReady, installed, installationChecked, platform.label, workerReady]);

  const onPrimaryAction = async () => {
    setMessage(null);

    if (inAppBrowser) {
      setMessage('از منوی سه‌نقطه بالای صفحه، «Open in Chrome / باز کردن در Chrome» را انتخاب کنید. نصب PWA در پنجره موقت یا Custom Tab قابل اتکا نیست.');
      return;
    }
    if (installed) {
      setMessage(`برنامه از قبل روی ${platform.label} نصب شده است.`);
      return;
    }
    const latest = await refreshDiagnostics();
    if (!latest.productionRuntime) {
      setMessage('Runtime تولیدی اجرا نشده است. start_https.bat را ببندید و نسخه جدید را دوباره اجرا کنید.');
      return;
    }
    if (!latest.secureContext) {
      setMessage(`ابتدا از بخش «اعتماد HTTPS این دستگاه» فایل Root CA را دانلود و به‌عنوان CA certificate روی ${platform.label} نصب کنید؛ سپس مرورگر را کامل ببندید و دوباره باز کنید.`);
      return;
    }
    if (!latest.manifestInstallable) {
      setMessage('Manifest یا آیکون‌های نصب در دسترس نیستند؛ Runtime را یک‌بار متوقف و دوباره اجرا کنید تا Build تولیدی بازسازی شود.');
      return;
    }
    if (ios) {
      setShowIOSHelp(true);
      return;
    }

    if (!latest.serviceWorkerActive || !latest.serviceWorkerControlling || latest.serviceWorkerError) {
      const outcome = await prepareServiceWorker();
      if (outcome === 'reloading') return;
      const afterRepair = await refreshDiagnostics();
      if (outcome === 'controlled' || afterRepair.serviceWorkerControlling) {
        setMessage('سرویس‌ورکر با موفقیت فعال شد. چند لحظه صبر کنید؛ دکمه نصب پس از صدور مجوز Chrome فعال می‌شود.');
      } else if (outcome === 'pending') {
        setMessage('سرویس‌ورکر ثبت شد و در حال فعال‌شدن است. صفحه را یک‌بار تازه‌سازی کنید.');
      } else if (outcome === 'unsupported') {
        setMessage('این مرورگر از Service Worker پشتیبانی نمی‌کند؛ صفحه را با نسخه اصلی Chrome باز کنید.');
      } else {
        setMessage(afterRepair.serviceWorkerError || 'ترمیم سرویس‌ورکر کامل نشد؛ داده‌های سایت را در Chrome پاک و صفحه را دوباره باز کنید.');
      }
      return;
    }

    if (!installReady) {
      setMessage('شرایط فنی کامل است. منوی سه‌نقطه Chrome را باز کنید؛ گزینه «Install app / نصب برنامه» یا «Add to Home screen» باید قابل انتخاب باشد.');
      return;
    }

    try {
      const outcome = await requestInstall();
      if (outcome === 'ios-help') {
        setShowIOSHelp(true);
      } else if (outcome === 'accepted') {
        setMessage(`درخواست نصب پذیرفته شد؛ برنامه پس از تکمیل به‌صورت مستقل روی ${platform.label} اجرا می‌شود.`);
      } else if (outcome === 'dismissed') {
        setMessage('نصب لغو شد. برای تلاش دوباره صفحه را تازه‌سازی کنید.');
      } else if (outcome === 'already-installed') {
        setMessage(`برنامه از قبل روی ${platform.label} نصب شده است.`);
      } else {
        setMessage('Chrome پنجره مستقیم را صادر نکرده است؛ از منوی سه‌نقطه گزینه Install app را انتخاب کنید.');
      }
    } catch {
      setMessage('پنجره نصب باز نشد؛ صفحه را در تب اصلی Chrome باز و دوباره تلاش کنید.');
    }
  };

  const diagnosticRows = [
    {
      label: 'سیستم شناسایی‌شده',
      value: true,
      hint: `${platform.label} · ${platform.family === 'desktop' ? 'رایانه' : 'موبایل یا تبلت'}`,
    },
    {
      label: 'Runtime تولیدی',
      value: diagnostics?.productionRuntime === true,
      hint: diagnostics?.productionRuntime ? 'فایل‌های dist و sw.js تولیدی در حال اجرا هستند.' : 'نسخه Development برای نصب مناسب نیست.',
    },
    {
      label: 'اتصال امن',
      value: diagnostics?.secureContext === true,
      hint: diagnostics?.secureContext ? 'APIهای امن مرورگر فعال‌اند.' : 'گواهی یا آدرس هنوز مورد اعتماد نیست.',
    },
    {
      label: 'Manifest نصب',
      value: diagnostics?.manifestInstallable === true,
      hint: diagnostics?.manifestInstallable ? 'Manifest و آیکون‌های ۱۹۲ و ۵۱۲ آماده‌اند.' : 'Manifest یا آیکون‌ها ناقص‌اند.',
    },
    {
      label: 'سرویس‌ورکر',
      value: workerReady,
      hint: diagnostics?.serviceWorkerError
        ? diagnostics.serviceWorkerError
        : workerReady
          ? 'فعال است و صفحه را کنترل می‌کند.'
          : diagnostics?.serviceWorkerActive
            ? 'فعال شده و منتظر کنترل صفحه است.'
            : 'در حال ثبت یا فعال‌سازی است.',
    },
    {
      label: 'مجوز نصب Chrome',
      value: installReady || installed || ios,
      hint: installReady ? 'پنجره رسمی نصب آماده است.' : installed ? 'برنامه نصب شده است.' : ios ? 'نصب از Share انجام می‌شود.' : 'هنوز رویداد نصب صادر نشده است.',
    },
  ];

  return (
    <AuthPageShell
      variant="liquid"
      panelSize="lg"
      liquidLayout="compact"
      liquidAppearance="install"
      title={platform.installLabel}
      description={platform.installDescription}
      footer="Kourosh Local PWA · شبکه داخلی فروشگاه"
    >
      <div
        className="space-y-2.5 sm:space-y-3"
        data-ui-pwa-platform={platform.id}
        data-ui-pwa-install-state={!installationChecked ? 'checking' : installed ? 'installed' : 'not-installed'}
      >
        <AuthInsetPanel
          className={cn('rounded-[22px] px-3.5 py-3 sm:px-4 sm:py-4', authGoldPanelClasses)}
          data-ui-connection-health
        >
          <div className="flex flex-wrap items-start justify-between gap-2.5">
            <div className="min-w-0">
              <p className={cn('text-sm font-black sm:text-base', authGoldTitleTextClasses)}>سلامت اتصال شبکه</p>
              <p className={cn('mt-1 text-[10px] font-medium leading-5 sm:text-[11px] sm:leading-6', authGoldMutedTextClasses)}>
                آدرس شبکه، API و HTTPS به‌صورت زنده بررسی می‌شوند.
              </p>
            </div>
            <Button
              type="button"
              unstyled
              autoIcon={false}
              onClick={() => void refreshConnectionHealth()}
              disabled={connectionHealth.checking}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[16px] !border !border-[#c7a86f]/20 !bg-[#141116] !bg-none px-3 text-[10px] font-black !text-[#d8bd8b] !shadow-none transition hover:!border-[#dabb82]/40 hover:!bg-[#1c171d] disabled:cursor-wait disabled:opacity-55 sm:text-[11px]"
            >
              <i className={`fa-solid fa-rotate ${connectionHealth.checking ? 'animate-spin' : ''}`} aria-hidden="true" />
              بررسی مجدد
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3" data-ui-connection-health-rows>
            {([
              ['شبکه داخلی', connectionHealth.runtimeReachable && connectionHealth.shareable, connectionHealth.publicHost || 'IP پیدا نشد'],
              ['API برنامه', connectionHealth.apiReachable, connectionHealth.apiReachable ? 'پاسخ‌گو' : 'بدون پاسخ'],
              ['HTTPS معتبر', connectionHealth.secure, connectionHealth.secure ? 'فعال' : 'نیاز به اعتماد'],
            ] as Array<[string, boolean, string]>).map(([label, ok, hint]) => (
              <div key={String(label)} className="flex min-w-0 items-center gap-2 rounded-[16px] border border-[#c7a86f]/12 bg-black/15 px-2.5 py-2.5">
                <i className={`fa-solid ${ok ? 'fa-circle-check text-emerald-300' : 'fa-circle-exclamation text-amber-300'} text-xs`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-[#ddc08a] sm:text-[11px]">{label}</p>
                  <p className="truncate text-[9px] font-medium text-[#b79b6a]/80 sm:text-[10px]" dir={label === 'شبکه داخلی' ? 'ltr' : 'rtl'}>{hint}</p>
                </div>
              </div>
            ))}
          </div>

          {qrReady ? (
            <div className="mt-3 grid items-center gap-3 border-t border-[#c7a86f]/12 pt-3 sm:grid-cols-[168px_minmax(0,1fr)]" data-ui-connection-qr="ready">
              <div className="mx-auto rounded-[22px] border border-[#d8bd8b]/25 bg-[#f4ead7] p-2 shadow-[0_18px_42px_-28px_rgba(216,189,139,0.58)]">
                <QRCodeSVG
                  value={connectionHealth.qrUrl || ''}
                  size={150}
                  level="M"
                  bgColor="#f4ead7"
                  fgColor="#3f3025"
                  aria-label="QR اتصال موبایل به برنامه کوروش"
                />
              </div>
              <div className="min-w-0 text-center sm:text-right">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <p className="text-xs font-black text-[#e3c995] sm:text-sm">اتصال گوشی به کوروش</p>
                  <span className={`text-[9px] font-black sm:text-[10px] ${connectionHealth.remoteAccessVerified ? 'text-emerald-300' : 'text-[#c7b18b]/75'}`} data-ui-mobile-access-status>
                    {connectionHealth.remoteAccessVerified ? 'دسترسی موبایل تأیید شد' : 'منتظر اسکن گوشی'}
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-medium leading-5 text-[#b79b6a]/85 sm:text-[11px] sm:leading-6">
                  گوشی و رایانه باید روی یک Wi‑Fi باشند. پس از اسکن، تأیید دسترسی موبایل حداکثر طی چند ثانیه نمایش داده می‌شود.
                </p>
                <p className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap rounded-[14px] border border-[#c7a86f]/12 bg-black/20 px-3 py-2 text-left text-[10px] font-bold text-[#d8bd8b]" dir="ltr" data-ui-connection-public-url>
                  {connectionHealth.publicUrl}
                </p>
                <Button
                  type="button"
                  unstyled
                  autoIcon={false}
                  onClick={() => void copyPublicAddress()}
                  className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[16px] !border !border-[#c7a86f]/20 !bg-[#141116] !bg-none px-3 text-[10px] font-black !text-[#d8bd8b] !shadow-none transition hover:!border-[#dabb82]/40 hover:!bg-[#1c171d] sm:text-[11px]"
                >
                  <i className={`fa-solid ${addressCopied ? 'fa-check' : 'fa-copy'}`} aria-hidden="true" />
                  {addressCopied ? 'آدرس کپی شد' : 'کپی آدرس اتصال'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-2 border-t border-[#c7a86f]/12 pt-3 text-[10px] font-medium leading-5 text-[#c7b18b]/80 sm:text-[11px] sm:leading-6" data-ui-connection-qr="blocked">
              <i className={`fa-solid ${connectionCoreReady ? 'fa-circle-info' : 'fa-triangle-exclamation'} mt-1 ${connectionCoreReady ? 'text-[#d8bd8b]' : 'text-amber-300'}`} aria-hidden="true" />
              <p>
                {platform.family === 'mobile' && connectionCoreReady
                  ? 'این گوشی از شبکه داخلی به برنامه متصل است؛ QR فقط روی رایانه میزبان نمایش داده می‌شود.'
                  : connectionHealth.setupRequired === true
                    ? 'ابتدا حساب مدیر اولیه را روی رایانه میزبان بسازید؛ سپس QR اتصال گوشی فعال می‌شود.'
                    : connectionCoreReady && !connectionHealth.hostDevice
                      ? 'QR فقط روی رایانه‌ای نمایش داده می‌شود که Runtime کوروش را اجرا کرده است.'
                      : connectionHealth.error || 'QR تا زمان تأیید شبکه، API و HTTPS نمایش داده نمی‌شود.'}
              </p>
            </div>
          )}
        </AuthInsetPanel>

        <AuthInsetPanel
          variant="bar"
          className={cn('rounded-[20px] px-3.5 py-3 sm:px-4 sm:py-3.5', authGoldPanelClasses)}
          contentClassName="grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2.5"
          aria-live="polite"
        >
          <i
            className={`${installed || installReady ? 'fa-solid fa-circle-check' : inAppBrowser ? 'fa-solid fa-arrow-up-right-from-square' : platform.iconClass} mt-0.5 text-base ${installed ? 'text-emerald-300' : installReady ? 'text-[#ddc08a]' : 'text-[#c9ad79]'}`}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={cn('text-sm font-black sm:text-base', authGoldTitleTextClasses)}>وضعیت نصب</p>
              <span
                data-ui-pwa-status-badge
                className={`text-[10px] font-black sm:text-[11px] ${installed ? 'text-emerald-300' : installReady || coreReady ? 'text-[#d8bd8b]' : 'text-[#a98a64]'}`}
              >
                {installed ? 'نصب شده' : installReady ? 'آماده نصب' : coreReady ? 'در حال آماده‌سازی' : 'نیاز به بررسی'}
              </span>
            </div>
            <p className={cn('mt-1 break-words text-[11px] font-medium leading-5 sm:text-xs sm:leading-6', authGoldMutedTextClasses)}>
              {readinessLabel}
            </p>
          </div>
        </AuthInsetPanel>

        {message ? (
          <AuthInsetPanel
            variant="bar"
            className={cn('rounded-[18px] px-3 py-2.5', authGoldPanelClasses)}
            contentClassName="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-2 text-[11px] font-medium leading-5 text-[#e3cfab] sm:text-xs sm:leading-6"
          >
            <i className="fa-solid fa-circle-info mt-1 text-[#d8bd8b]" aria-hidden="true" />
            <p className="break-words">{message}</p>
          </AuthInsetPanel>
        ) : null}

        <AuthInsetPanel className={cn('rounded-[20px] px-3.5 py-2.5 sm:px-4 sm:py-3', authGoldPanelClasses)}>
          <details className="group" open={diagnostics?.secureContext === false}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black text-[#ddc08a] sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-[#c9ad79]" aria-hidden="true" />
                اعتماد HTTPS این دستگاه
              </span>
              <i className="fa-solid fa-chevron-down text-[10px] text-[#a98a64] transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-3 space-y-2.5 border-t border-[#c7a86f]/12 pt-3">
              <p className="text-[10px] font-medium leading-5 text-[#b79b6a]/85 sm:text-[11px] sm:leading-6">
                این فایل فقط کلید عمومی اعتماد فروشگاه است و هیچ کلید خصوصی داخل آن نیست. آن را فقط روی دستگاه‌های متعلق به فروشگاه نصب کنید.
              </p>
              <a
                href={rootCaDownloadUrl}
                download
                data-ui-pwa-root-ca-download
                className={cn('inline-flex min-h-11 w-full text-xs sm:text-sm', authGoldSecondaryActionClasses)}
              >
                <i className="fa-solid fa-certificate" aria-hidden="true" />
                دانلود Root CA موبایل
              </a>
              <p className="text-[10px] font-medium leading-5 text-[#b79b6a]/80 sm:text-[11px] sm:leading-6">
                {platform.id === 'android'
                  ? 'در Samsung/Android: Security and privacy ← More security settings ← Install from device storage ← CA certificate. سپس Chrome را از Recent Apps کامل ببندید.'
                  : platform.id === 'ios'
                    ? 'در iPhone/iPad فایل را نصب کنید و سپس از Certificate Trust Settings اعتماد کامل SSL/TLS را فعال کنید.'
                    : 'در ویندوز اجرای start_https.bat اعتماد را خودکار بررسی می‌کند؛ اگر مرورگر هنوز هشدار داد، فایل را در Trusted Root Certification Authorities کاربر جاری نصب کنید.'}
              </p>
            </div>
          </details>
        </AuthInsetPanel>

        <div className="grid gap-2">
          {!installed ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              data-ui-pwa-primary-action
              className={cn('min-h-12 w-full', authGoldPrimaryActionClasses)}
              onClick={onPrimaryAction}
              loading={checking}
              loadingText="در حال بررسی و ترمیم…"
              rightIcon={<i className={`fa-solid ${installReady || ios ? 'fa-download' : inAppBrowser ? 'fa-arrow-up-right-from-square' : 'fa-wrench'}`} aria-hidden="true" />}
            >
              {installReady ? platform.installLabel : ios ? 'راهنمای نصب iPhone / iPad' : inAppBrowser ? 'باز کردن در Chrome' : 'بررسی و آماده‌سازی نصب'}
            </Button>
          ) : null}

          <a
            href="#/login"
            className={cn('inline-flex min-h-11 w-full text-xs sm:text-sm', authGoldSecondaryActionClasses)}
          >
            <i className="fa-solid fa-arrow-right" aria-hidden="true" />
            بازگشت به ورود
          </a>
        </div>

        <AuthInsetPanel className={cn('rounded-[20px] px-3.5 py-2.5 sm:px-4 sm:py-3', authGoldPanelClasses)}>
          <details className="group" open={!coreReady || Boolean(diagnostics?.serviceWorkerError)}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black text-[#ddc08a] sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <i className="fa-solid fa-list-check text-[#c9ad79]" aria-hidden="true" />
                جزئیات فنی نصب
              </span>
              <i className="fa-solid fa-chevron-down text-[10px] text-[#a98a64] transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>

            <div className="mt-2.5 divide-y divide-[#c7a86f]/10 border-t border-[#c7a86f]/12">
              {diagnosticRows.map((row) => (
                <div key={row.label} className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-2.5 py-2.5">
                  <i
                    className={`fa-solid ${statusIcon(row.value)} mt-1 text-xs ${row.value ? 'text-emerald-300' : 'text-amber-300'}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-black text-[#ddc08a] sm:text-[13px]">{row.label}</p>
                      <span className={`text-[10px] font-black ${row.value ? 'text-emerald-300' : 'text-[#d8bd8b]'}`}>
                        {row.value ? 'تأیید' : 'نیاز به بررسی'}
                      </span>
                    </div>
                    <p className="mt-1 break-words text-[10px] font-medium leading-5 text-[#b79b6a]/80 sm:text-[11px]">{row.hint}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </AuthInsetPanel>

        {showIOSHelp ? (
          <AuthInsetPanel className={cn('rounded-[20px] px-4 py-3', authGoldPanelClasses)} contentClassName="space-y-1.5 text-xs font-medium leading-6 text-[#c7b18b]/80">
            <p className="font-black text-[#ddc08a]">نصب روی iPhone / iPad</p>
            <p>۱. صفحه را با Safari باز کنید.</p>
            <p>۲. Share را بزنید.</p>
            <p>۳. Add to Home Screen و سپس Add را انتخاب کنید.</p>
          </AuthInsetPanel>
        ) : null}
      </div>
    </AuthPageShell>
  );
};

export default InstallApp;
