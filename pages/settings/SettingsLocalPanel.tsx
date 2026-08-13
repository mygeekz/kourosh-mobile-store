import React, { useEffect, useState } from 'react';
import Button from '../../components/Button';
import { SelectField, TextField } from '@/components/ui';
import type { SettingsLocalPanelProps } from './settingsPanelTypes';
import { useConfirm } from '../../contexts/ConfirmContext';
import { inspectPwaRuntime, PWA_RESET_COMPLETED_STORAGE_KEY, resetPwaRuntime, type PwaResetProgress, type PwaResetStepId } from '../../hooks/usePwaInstall';


type PwaResetStepDefinition = {
  id: PwaResetStepId;
  label: string;
  icon: string;
};

const PWA_RESET_STEP_DEFINITIONS: PwaResetStepDefinition[] = [
  { id: 'registrations', label: 'ثبت‌های سرویس‌ورکر', icon: 'fa-solid fa-link-slash' },
  { id: 'caches', label: 'حافظه کش PWA', icon: 'fa-solid fa-box-archive' },
  { id: 'manifest', label: 'Manifest نصب', icon: 'fa-solid fa-file-code' },
  { id: 'worker-asset', label: 'فایل sw.js', icon: 'fa-solid fa-gears' },
  { id: 'registration', label: 'ثبت Service Worker', icon: 'fa-solid fa-rotate' },
  { id: 'controller', label: 'کنترل صفحه', icon: 'fa-solid fa-shield-halved' },
];

const createInitialPwaResetSteps = (): PwaResetProgress[] => PWA_RESET_STEP_DEFINITIONS.map((step) => ({
  id: step.id,
  label: step.label,
  status: 'pending',
  detail: 'در انتظار بررسی',
}));

const pwaResetStatusMeta = {
  pending: { label: 'در انتظار', icon: 'fa-regular fa-circle', tone: 'text-slate-400 dark:text-slate-500' },
  running: { label: 'در حال اجرا', icon: 'fa-solid fa-spinner fa-spin', tone: 'text-sky-600 dark:text-sky-300' },
  success: { label: 'تأیید', icon: 'fa-solid fa-circle-check', tone: 'text-emerald-600 dark:text-emerald-300' },
  warning: { label: 'نیاز به بررسی', icon: 'fa-solid fa-triangle-exclamation', tone: 'text-amber-600 dark:text-amber-300' },
  error: { label: 'ناموفق', icon: 'fa-solid fa-circle-xmark', tone: 'text-rose-600 dark:text-rose-300' },
} as const;

const SettingsLocalPanel = ({
  tab,
  businessInfo,
  labelClass,
  inputClass,
  localHostnameValue,
  localSuffixValue,
  localDomainValue,
  localHostsLineValue,
  localCertMessage,
  localCertError,
  isGeneratingLocalCert,
  infoChanged,
  isSaving,
  isAdmin,
  handleGenerateLocalCertificate,
  handleDownloadHostsScript,
  handleDownloadLocalCertificate,
  handleBusinessInfoChange,
  handleBusinessInfoSubmit,
}: SettingsLocalPanelProps) => {
  const confirmAction = useConfirm();
  const [isCheckingPwa, setIsCheckingPwa] = useState(false);
  const [isResettingPwa, setIsResettingPwa] = useState(false);
  const [pwaResetSteps, setPwaResetSteps] = useState<PwaResetProgress[]>(createInitialPwaResetSteps);
  const [pwaResetMessage, setPwaResetMessage] = useState<string | null>(null);
  const [pwaResetError, setPwaResetError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let completedAfterReload = false;

    try {
      completedAfterReload = sessionStorage.getItem(PWA_RESET_COMPLETED_STORAGE_KEY) === '1';
      if (completedAfterReload) sessionStorage.removeItem(PWA_RESET_COMPLETED_STORAGE_KEY);
    } catch {
      // Session storage is optional in restricted browser modes.
    }

    const runInitialInspection = async () => {
      setIsCheckingPwa(true);
      setPwaResetError(null);
      try {
        const result = await inspectPwaRuntime({
          onProgress: (progress) => {
            if (cancelled) return;
            setPwaResetSteps((current) => current.map((step) => step.id === progress.id ? progress : step));
          },
        });
        if (cancelled) return;
        setPwaResetMessage(
          completedAfterReload && result.success
            ? 'بازنشانی کامل PWA انجام شد و بررسی پس از Reload نیز سالم است.'
            : result.message,
        );
      } catch (error) {
        if (!cancelled) setPwaResetError(error instanceof Error ? error.message : 'بررسی وضعیت PWA کامل نشد.');
      } finally {
        if (!cancelled) setIsCheckingPwa(false);
      }
    };

    void runInitialInspection();
    return () => { cancelled = true; };
  }, []);

  const handleInspectPwaRuntime = async () => {
    if (isCheckingPwa || isResettingPwa) return;
    setIsCheckingPwa(true);
    setPwaResetMessage(null);
    setPwaResetError(null);
    setPwaResetSteps(createInitialPwaResetSteps());

    try {
      const result = await inspectPwaRuntime({
        onProgress: (progress) => {
          setPwaResetSteps((current) => current.map((step) => step.id === progress.id ? progress : step));
        },
      });
      setPwaResetMessage(result.message);
    } catch (error) {
      setPwaResetError(error instanceof Error ? error.message : 'بررسی وضعیت PWA کامل نشد.');
    } finally {
      setIsCheckingPwa(false);
    }
  };

  const handleResetPwaRuntime = async () => {
    if (!isAdmin || isResettingPwa || isCheckingPwa) return;
    const confirmed = await confirmAction({
      title: 'بازنشانی کامل PWA',
      description: 'ثبت‌های Service Worker و Cache Storage همین آدرس پاک می‌شوند، Manifest و sw.js دوباره اعتبارسنجی می‌شوند و Runtime تازه ثبت خواهد شد. اطلاعات فروشگاه، دیتابیس و نشست ورود حذف نمی‌شوند.',
      confirmText: 'بازنشانی PWA',
      cancelText: 'انصراف',
      tone: 'warning',
      iconClass: 'fa-solid fa-arrows-rotate',
      summaryItems: [
        { label: 'محدوده', value: window.location.origin },
        { label: 'اطلاعات فروشگاه', value: 'بدون تغییر' },
      ],
    });
    if (!confirmed) return;

    setIsResettingPwa(true);
    setPwaResetMessage(null);
    setPwaResetError(null);
    setPwaResetSteps(createInitialPwaResetSteps());

    try {
      const result = await resetPwaRuntime({
        onProgress: (progress) => {
          setPwaResetSteps((current) => current.map((step) => step.id === progress.id ? progress : step));
        },
      });

      if (!result.success) {
        setPwaResetError(result.message);
        return;
      }

      setPwaResetMessage(result.message);
      if (result.requiresReload) {
        window.setTimeout(() => window.location.reload(), 1600);
      }
    } catch (error) {
      setPwaResetError(error instanceof Error ? error.message : 'بازنشانی PWA کامل نشد.');
    } finally {
      setIsResettingPwa(false);
    }
  };

  if (tab !== 'local') return null;

  return (

            <div className="settings-panel-root settings-local-panel space-y-6" data-ui-settings-panel="local">
              <div className="settings-hero-card rounded-[28px] border border-sky-200/70 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.14),_transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))] p-5 shadow-[0_24px_70px_-36px_rgba(14,165,233,0.22)] dark:border-sky-900/30 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(15,23,42,0.9))]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-black text-sky-700 shadow-sm dark:border-sky-900/40 dark:bg-slate-900/70 dark:text-sky-200">
                      <i className="fa-solid fa-network-wired" />
                      Local Access · HTTPS · PWA
                    </div>
                    <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">دسترسی محلی و PWA برای شبکه فروشگاه</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      این بخش فقط دسترسی Dashboard/PWA داخل LAN، نام محلی، HTTPS، Root CA، وضعیت گواهی و فایل hosts را مدیریت می‌کند.
                    </div>
                  </div>
                  <div className="grid min-w-0 grid-cols-2 gap-3" data-ui-settings-grid="form">
                    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">دامنه فعلی</div>
                      <div className="mt-1 text-sm font-black text-slate-900 dark:text-white truncate">{localDomainValue || '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">وضعیت TLS</div>
                      <div className={`mt-1 text-sm font-black ${localDomainValue ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {localDomainValue ? 'آماده ساخت' : 'نیاز به hostname'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="telegram-monitor-actions">
                  <Button type="button" onClick={handleGenerateLocalCertificate} disabled={isGeneratingLocalCert || !localHostnameValue} loading={isGeneratingLocalCert} loadingText="در حال ساخت گواهی…" variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-certificate" />}>
                    ساخت/بازسازی certificate موبایل
                  </Button>
                  <Button type="button" onClick={handleDownloadHostsScript} disabled={!localHostnameValue} variant="success" size="sm" leftIcon={<i className="fa-solid fa-file-arrow-down" />}>
                    دانلود فایل hosts
                  </Button>
                  <Button type="button" onClick={handleDownloadLocalCertificate} disabled={!localHostnameValue} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-download" />}>
                    دانلود Root CA موبایل
                  </Button>
                  <Button type="button" onClick={() => localHostsLineValue && navigator.clipboard?.writeText(localHostsLineValue)} disabled={!localHostsLineValue} variant="ghost" size="sm" leftIcon={<i className="fa-solid fa-copy" />}>
                    کپی خط hosts
                  </Button>
                </div>
                {(localCertMessage || localCertError) && (
                  <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${localCertError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'}`}>
                    {localCertError || localCertMessage}
                  </div>
                )}
              </div>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300">
                      <i className="fa-solid fa-network-wired" />
                      Local Access · HTTPS · PWA
                    </div>
                    <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-white">تنظیم دسترسی محلی</h3>
                    <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">برای شبکه داخلی، hostname و suffix را مشخص کنید تا Local URL و hosts پیشنهادی ساخته شوند.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <i className="fa-solid fa-shield-halved" />
                      فقط آدرس‌های داخلی
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <i className="fa-solid fa-terminal" />
                      hosts / certificate
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2" data-ui-settings-grid="form">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className={labelClass}><i className="fa-solid fa-network-wired ml-2 text-sky-500" />Hostname محلی</div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-server" /></span>
                      <TextField controlOnly type="text" id="local_hostname" name="local_hostname" value={businessInfo.local_hostname || ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token pr-12`} dir="ltr" preview="kourosh" />
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">فقط حروف انگلیسی، عدد و خط تیره مجاز است.</p>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className={labelClass}><i className="fa-solid fa-globe ml-2 text-sky-500" />Suffix محلی</div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-code-branch" /></span>
                      <SelectField controlOnly unstyled showChevron={false} icon={false} id="local_domain_suffix" name="local_domain_suffix" value={localSuffixValue} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token pr-12`} dir="ltr">
                        <option value="home.arpa">home.arpa — پیشنهادی</option>
                        <option value="internal">internal</option>
                        <option value="lan">lan</option>
                        {localSuffixValue === 'localhost' && <option value="localhost">localhost — تنظیم قدیمی</option>}
                        {localSuffixValue === 'local' && <option value="local">local — تنظیم قدیمی</option>}
                        {localSuffixValue && !['home.arpa', 'internal', 'lan', 'localhost', 'local'].includes(localSuffixValue) && (
                          <option value={localSuffixValue}>{localSuffixValue} — نامعتبر</option>
                        )}
                      </SelectField>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">برای نصب تازه، home.arpa پیشنهاد می‌شود. localhost و .local فقط در پیکربندی قدیمی حفظ می‌شوند و به‌صورت خودکار ساخته نمی‌شوند.</p>
                    {(localSuffixValue === 'localhost' || localSuffixValue === 'local') && (
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                        <i className="fa-solid fa-clock-rotate-left" />
                        تنظیم قدیمی — بدون migration خودکار
                      </div>
                    )}
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className={labelClass}><i className="fa-solid fa-link ml-2 text-sky-500" />آدرس کامل</div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-up-right-from-square" /></span>
                      <TextField controlOnly type="text" readOnly value={localDomainValue ? `https://${localDomainValue}:5173/#/` : ''} className={`${inputClass} bg-gray-50 pr-12 dark:bg-gray-900`} dir="ltr" preview="https://kourosh.home.arpa:5173/#/" />
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className={labelClass}><i className="fa-solid fa-file-lines ml-2 text-sky-500" />خط hosts پیشنهادی</div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-code" /></span>
                      <TextField controlOnly type="text" readOnly value={localHostsLineValue} className={`${inputClass} bg-gray-50 pr-12 dark:bg-gray-900`} dir="ltr" preview="192.168.1.10 kourosh.home.arpa" />
                    </div>
                  </div>

                  <div className="settings-grid-span-full rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className={labelClass}><i className="fa-solid fa-sitemap ml-2 text-sky-500" />آدرس پایه محلی</div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-globe" /></span>
                      <TextField controlOnly type="url" id="local_base_url" name="local_base_url" value={businessInfo.local_base_url || ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token pr-12`} dir="ltr" preview="https://kourosh.home.arpa:5173/#/" />
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">این مقدار فقط Base URL محلی Dashboard/PWA است. اگر خالی باشد از hostname و suffix محلی ساخته می‌شود.</p>
                    <p className="mt-1 text-xs leading-6 text-amber-600 dark:text-amber-300">روی دستگاه‌های دیگر LAN نیز باید نام محلی با hosts یا DNS داخلی resolve شود. Root CA فقط برای اعتماد HTTPS محلی استفاده می‌شود.</p>
                  </div>

                </div>
              </section>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-950 dark:text-white"><i className="fa-solid fa-shield-halved ml-2 text-emerald-500" />نصب گواهی روی دستگاه‌های مورد اعتماد</h3>
                    <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">ابتدا «دانلود Root CA موبایل» را بزنید. این فایل، مرجع اعتماد گواهی‌های محلی کوروش است و فقط باید روی کامپیوتر و گوشی‌های متعلق به فروشگاه نصب شود.</p>
                  </div>
                  <Button type="button" onClick={handleDownloadLocalCertificate} disabled={!localHostnameValue} variant="success" size="sm" leftIcon={<i className="fa-solid fa-download" />}>
                    دانلود گواهی ریشه
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3" data-ui-settings-grid="cards">
                  <details className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <summary className="cursor-pointer font-black text-slate-900 dark:text-white"><i className="fa-brands fa-windows ml-2 text-sky-500" />Windows</summary>
                    <div className="mt-3 text-xs leading-7 text-slate-600 dark:text-slate-300">فایل Root CA موبایل نسخه ۳ را باز کنید، Install Certificate را بزنید، Current User و سپس Trusted Root Certification Authorities را انتخاب کنید. نسخه‌های قدیمی Kourosh Local Root CA را حذف و در پایان مرورگر را کاملاً ببندید و دوباره اجرا کنید.</div>
                  </details>
                  <details className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <summary className="cursor-pointer font-black text-slate-900 dark:text-white"><i className="fa-brands fa-android ml-2 text-emerald-500" />Android</summary>
                    <div className="mt-3 text-xs leading-7 text-slate-600 dark:text-slate-300">ابتدا گواهی‌های قدیمی با نام Kourosh Local Root CA را حذف کنید. سپس در تنظیمات امنیت یا Encryption &amp; credentials، گزینه Install a certificate و بعد CA certificate را انتخاب و فایل Root CA موبایل نسخه ۳ را نصب کنید. نصب در بخش VPN and apps کافی نیست؛ نوع گواهی باید CA certificate باشد. پس از نصب، Chrome را از Recent Apps کامل ببندید.</div>
                  </details>
                  <details className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <summary className="cursor-pointer font-black text-slate-900 dark:text-white"><i className="fa-brands fa-apple ml-2 text-slate-500" />iPhone / iPad</summary>
                    <div className="mt-3 text-xs leading-7 text-slate-600 dark:text-slate-300">فایل Root CA موبایل نسخه ۳ را نصب کنید؛ سپس از Settings → General → About → Certificate Trust Settings، اعتماد کامل SSL/TLS را برای گواهی Kourosh Local Root CA v3 فعال کنید و Safari را دوباره باز کنید.</div>
                  </details>
                </div>
              </section>

              {isAdmin && (
                <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 md:p-6" aria-labelledby="pwa-reset-heading">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 text-xs font-black text-amber-700 dark:text-amber-300">
                        <i className="fa-solid fa-screwdriver-wrench" aria-hidden="true" />
                        ابزار نگهداری مدیر سیستم
                      </div>
                      <h3 id="pwa-reset-heading" className="mt-2 text-lg font-black text-slate-950 dark:text-white">سلامت و بازنشانی PWA</h3>
                      <p className="mt-1 max-w-3xl text-xs leading-6 text-slate-500 dark:text-slate-400">
                        وضعیت Runtime نصب‌شونده همین Origin به‌صورت خودکار و بدون حذف اطلاعات بررسی می‌شود. دکمه بازنشانی فقط در صورت خطا، Registrationها و Cache Storage را بازسازی می‌کند؛ دیتابیس، تنظیمات و نشست ورود دست‌نخورده باقی می‌مانند.
                      </p>
                    </div>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <Button
                        type="button"
                        onClick={() => { void handleInspectPwaRuntime(); }}
                        disabled={isCheckingPwa || isResettingPwa}
                        loading={isCheckingPwa}
                        loadingText="در حال بررسی…"
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto"
                        leftIcon={<i className="fa-solid fa-stethoscope" />}
                      >
                        بررسی وضعیت PWA
                      </Button>
                      <Button
                        type="button"
                        onClick={() => { void handleResetPwaRuntime(); }}
                        disabled={isResettingPwa || isCheckingPwa}
                        loading={isResettingPwa}
                        loadingText="در حال بازنشانی PWA…"
                        loadingHint="پاک‌سازی و ثبت مجدد Runtime"
                        variant="warning"
                        size="sm"
                        className="w-full sm:w-auto"
                        leftIcon={<i className="fa-solid fa-arrows-rotate" />}
                      >
                        بازنشانی کامل PWA
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2" data-ui-settings-grid="cards">
                    {pwaResetSteps.map((step) => {
                      const definition = PWA_RESET_STEP_DEFINITIONS.find((item) => item.id === step.id);
                      const meta = pwaResetStatusMeta[step.status];
                      return (
                        <div key={step.id} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                          <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <i className={`${definition?.icon || 'fa-solid fa-circle'} mt-1 text-slate-500 dark:text-slate-400`} aria-hidden="true" />
                              <div className="min-w-0">
                                <div className="font-black text-slate-900 dark:text-white">{step.label}</div>
                                <div className="mt-1 break-words text-xs leading-6 text-slate-500 dark:text-slate-400">{step.detail}</div>
                              </div>
                            </div>
                            <span className={`inline-flex shrink-0 items-center gap-1.5 text-[11px] font-black ${meta.tone}`}>
                              <i className={meta.icon} aria-hidden="true" />
                              {meta.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {(pwaResetMessage || pwaResetError) && (
                    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-7 ${pwaResetError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'}`} role={pwaResetError ? 'alert' : 'status'}>
                      {pwaResetError || pwaResetMessage}
                    </div>
                  )}
                </section>
              )}

              <div className="flex min-w-0 justify-end">
                <button
                  type="button"
                  onClick={(event) => { void handleBusinessInfoSubmit(event as unknown as React.FormEvent<HTMLFormElement>); }}
                  disabled={!infoChanged || isSaving}
                  className="inline-flex w-full min-w-0 flex-wrap items-center justify-center gap-2 whitespace-normal rounded-2xl bg-primary px-4 py-3 text-center font-semibold text-white shadow-lg transition-colors hover:brightness-110 disabled:opacity-60 sm:w-auto sm:px-6"
                >
                  <i className="fa-solid fa-floppy-disk" />
                  {isSaving ? 'در حال ذخیره تغییرات...' : 'ذخیره تغییرات تنظیمات محلی'}
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <i className="fa-solid fa-lightbulb text-amber-500" />
                  الگوی پیشنهادی
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3" data-ui-settings-grid="cards">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-server ml-2 text-sky-500" />Hostname</div>
                    <div className="mt-1 font-black" dir="ltr">kourosh</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-globe ml-2 text-sky-500" />Suffix</div>
                    <div className="mt-1 font-black" dir="ltr">home.arpa</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-link ml-2 text-sky-500" />نتیجه</div>
                    <div className="mt-1 font-black" dir="ltr">https://kourosh.home.arpa:5173/#/</div>
                  </div>
                </div>
              </div>
            </div>
          
  );
};

export default SettingsLocalPanel;
