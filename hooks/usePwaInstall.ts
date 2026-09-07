import { useCallback, useEffect, useMemo, useState } from 'react';

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type InstallOutcome = 'accepted' | 'dismissed' | 'ios-help' | 'already-installed' | 'unavailable';
export type ServiceWorkerPrepareOutcome = 'controlled' | 'reloading' | 'pending' | 'unsupported' | 'error';

export type PwaDiagnostics = {
  secureContext: boolean;
  productionRuntime: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  serviceWorkerActive: boolean;
  serviceWorkerControlling: boolean;
  serviceWorkerWaiting: boolean;
  serviceWorkerInstalling: boolean;
  serviceWorkerState: string;
  serviceWorkerScriptUrl: string | null;
  serviceWorkerScope: string | null;
  serviceWorkerError: string | null;
  manifestAvailable: boolean;
  manifestInstallable: boolean;
  manifestUrl: string | null;
};


export type PwaPlatformId =
  | 'windows'
  | 'macos'
  | 'linux'
  | 'chromeos'
  | 'android'
  | 'ios'
  | 'desktop'
  | 'mobile';

export type PwaPlatform = {
  id: PwaPlatformId;
  family: 'desktop' | 'mobile';
  label: string;
  installLabel: string;
  installDescription: string;
  iconClass: string;
};

export type PwaResetStepId =
  | 'registrations'
  | 'caches'
  | 'manifest'
  | 'worker-asset'
  | 'registration'
  | 'controller';

export type PwaResetStepStatus = 'pending' | 'running' | 'success' | 'warning' | 'error';

export type PwaResetProgress = {
  id: PwaResetStepId;
  label: string;
  status: PwaResetStepStatus;
  detail: string;
};

export type PwaResetResult = {
  success: boolean;
  requiresReload: boolean;
  message: string;
  diagnostics: PwaDiagnostics | null;
};

export type ResetPwaRuntimeOptions = {
  onProgress?: (progress: PwaResetProgress) => void;
};

type PwaSnapshot = {
  deferredPrompt: BeforeInstallPromptEvent | null;
  installed: boolean;
  installationChecked: boolean;
  serviceWorkerRegistration: ServiceWorkerRegistration | null;
  serviceWorkerError: string | null;
  revision: number;
};

const subscribers = new Set<() => void>();
const observedRegistrations = new WeakSet<ServiceWorkerRegistration>();
const observedWorkers = new WeakSet<ServiceWorker>();
let initialized = false;
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;
let snapshot: PwaSnapshot = {
  deferredPrompt: null,
  installed: false,
  installationChecked: false,
  serviceWorkerRegistration: null,
  serviceWorkerError: null,
  revision: 0,
};

const CONTROL_RELOAD_KEY = 'kourosh_pwa_control_reload_v2';
const REGISTRATION_RECOVERY_KEY = 'kourosh_pwa_registration_recovery_v1';
export const PWA_RESET_COMPLETED_STORAGE_KEY = 'kourosh_pwa_admin_reset_complete_v1';
const EXPECTED_SW_PATH = '/sw.js';
const INSTALLED_MARKER_KEY = 'kourosh_pwa_installed_v1';

type NavigatorWithPwaCapabilities = Navigator & {
  standalone?: boolean;
  userAgentData?: { platform?: string; mobile?: boolean };
  getInstalledRelatedApps?: () => Promise<Array<{ platform?: string; url?: string; id?: string }>>;
};

const readInstalledMarker = (): boolean => {
  try {
    return localStorage.getItem(INSTALLED_MARKER_KEY) === '1';
  } catch {
    return false;
  }
};

const writeInstalledMarker = (installed: boolean) => {
  try {
    if (installed) localStorage.setItem(INSTALLED_MARKER_KEY, '1');
    else localStorage.removeItem(INSTALLED_MARKER_KEY);
  } catch {
    // Storage is optional; runtime detection remains authoritative.
  }
};

export const detectPwaPlatform = (): PwaPlatform => {
  if (typeof navigator === 'undefined') {
    return {
      id: 'desktop',
      family: 'desktop',
      label: 'رایانه',
      installLabel: 'نصب برنامه روی رایانه',
      installDescription: 'نسخه مستقل سامانه را روی رایانه نصب کنید.',
      iconClass: 'fa-solid fa-desktop',
    };
  }

  const nav = navigator as NavigatorWithPwaCapabilities;
  const userAgent = String(nav.userAgent || '').toLowerCase();
  const platform = String(nav.userAgentData?.platform || nav.platform || '').toLowerCase();
  const ipadDesktopMode = platform.includes('mac') && Number(nav.maxTouchPoints || 0) > 1;

  if (/iphone|ipad|ipod/.test(userAgent) || ipadDesktopMode) {
    return {
      id: 'ios',
      family: 'mobile',
      label: 'iPhone / iPad',
      installLabel: 'نصب برنامه روی iPhone / iPad',
      installDescription: 'برنامه را از طریق Safari به صفحه اصلی اضافه کنید.',
      iconClass: 'fa-brands fa-apple',
    };
  }
  if (userAgent.includes('android')) {
    return {
      id: 'android',
      family: 'mobile',
      label: 'اندروید',
      installLabel: 'نصب برنامه روی اندروید',
      installDescription: 'نسخه مستقل سامانه را روی گوشی یا تبلت اندرویدی نصب کنید.',
      iconClass: 'fa-brands fa-android',
    };
  }
  if (userAgent.includes('cros') || platform.includes('chrome os')) {
    return {
      id: 'chromeos',
      family: 'desktop',
      label: 'ChromeOS',
      installLabel: 'نصب برنامه روی Chromebook',
      installDescription: 'نسخه مستقل سامانه را روی Chromebook نصب کنید.',
      iconClass: 'fa-brands fa-chrome',
    };
  }
  if (platform.includes('win') || userAgent.includes('windows')) {
    return {
      id: 'windows',
      family: 'desktop',
      label: 'ویندوز',
      installLabel: 'نصب برنامه روی ویندوز',
      installDescription: 'نسخه مستقل سامانه را به‌صورت یک برنامه روی ویندوز نصب کنید.',
      iconClass: 'fa-brands fa-windows',
    };
  }
  if (platform.includes('mac') || userAgent.includes('macintosh')) {
    return {
      id: 'macos',
      family: 'desktop',
      label: 'macOS',
      installLabel: 'نصب برنامه روی مک',
      installDescription: 'نسخه مستقل سامانه را به‌صورت یک برنامه روی macOS نصب کنید.',
      iconClass: 'fa-brands fa-apple',
    };
  }
  if (platform.includes('linux') || userAgent.includes('linux')) {
    return {
      id: 'linux',
      family: 'desktop',
      label: 'لینوکس',
      installLabel: 'نصب برنامه روی لینوکس',
      installDescription: 'نسخه مستقل سامانه را روی لینوکس نصب کنید.',
      iconClass: 'fa-brands fa-linux',
    };
  }

  const mobile = nav.userAgentData?.mobile === true || /mobile|tablet/.test(userAgent);
  return mobile
    ? {
        id: 'mobile',
        family: 'mobile',
        label: 'موبایل',
        installLabel: 'نصب برنامه روی موبایل',
        installDescription: 'نسخه مستقل سامانه را روی این دستگاه نصب کنید.',
        iconClass: 'fa-solid fa-mobile-screen-button',
      }
    : {
        id: 'desktop',
        family: 'desktop',
        label: 'رایانه',
        installLabel: 'نصب برنامه روی رایانه',
        installDescription: 'نسخه مستقل سامانه را روی این رایانه نصب کنید.',
        iconClass: 'fa-solid fa-desktop',
      };
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (['standalone', 'fullscreen', 'minimal-ui', 'window-controls-overlay'].some((mode) => window.matchMedia?.(`(display-mode: ${mode})`).matches)) return true;
  const nav = navigator as NavigatorWithPwaCapabilities;
  return nav.standalone === true;
};

const errorText = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return String(error || 'خطای نامشخص در سرویس نصب برنامه');
};

const friendlyServiceWorkerError = (error: unknown) => {
  const raw = errorText(error);
  const normalized = raw.toLowerCase();

  if (normalized.includes('invalid state') || normalized.includes("script ('unknown')")) {
    return 'اتصال قدیمی نسخه نصب‌شده در Chrome نامعتبر شده است؛ برنامه آن را پاک‌سازی و دوباره فعال می‌کند.';
  }
  if (normalized.includes('securityerror') || normalized.includes('certificate') || normalized.includes('ssl')) {
    return 'مرورگر به گواهی این آدرس اعتماد کامل ندارد؛ ابتدا گواهی اتصال امن را تأیید کنید.';
  }
  if (normalized.includes('404') || normalized.includes('not found')) {
    return 'فایل لازم برای اجرای نسخه نصب‌شده پیدا نشد؛ نسخه برنامه باید دوباره آماده‌سازی شود.';
  }
  if (normalized.includes('mime') || normalized.includes('content-type') || normalized.includes('text/html')) {
    return 'سرویس نصب برنامه پاسخ معتبری از سرور دریافت نکرد.';
  }
  if (normalized.includes('network') || normalized.includes('fetch') || normalized.includes('failed to load')) {
    return 'فایل لازم برای نسخه نصب‌شده از شبکه محلی دریافت نشد؛ اتصال برنامه را بررسی کنید.';
  }
  return 'فعال‌سازی نسخه نصب‌شده کامل نشد؛ پاک‌سازی خودکار انجام می‌شود و سپس صفحه باید یک‌بار تازه‌سازی شود.';
};

const emit = () => {
  snapshot = { ...snapshot, revision: snapshot.revision + 1 };
  subscribers.forEach((subscriber) => subscriber());
};

const setServiceWorkerError = (error: unknown) => {
  console.error('[pwa] Service worker lifecycle error:', error);
  const friendly = friendlyServiceWorkerError(error);
  if (snapshot.serviceWorkerError === friendly) return;
  snapshot = { ...snapshot, serviceWorkerError: friendly };
  emit();
};

const expectedScope = () => new URL('/', window.location.origin).href;
const expectedScriptUrl = () => new URL(EXPECTED_SW_PATH, window.location.origin).href;

const workerUsesExpectedScript = (worker: ServiceWorker | null | undefined) => {
  if (!worker?.scriptURL) return false;
  try {
    const actual = new URL(worker.scriptURL, window.location.origin);
    const expected = new URL(expectedScriptUrl());
    return actual.origin === expected.origin && actual.pathname === expected.pathname;
  } catch {
    return false;
  }
};

const observeWorker = (worker: ServiceWorker | null | undefined) => {
  if (!worker || observedWorkers.has(worker)) return;
  observedWorkers.add(worker);
  worker.addEventListener('statechange', () => emit());
};

const attachRegistration = (registration: ServiceWorkerRegistration | undefined | null) => {
  if (!registration) return;
  const registrationChanged = snapshot.serviceWorkerRegistration !== registration;
  const errorCleared = snapshot.serviceWorkerError !== null;

  snapshot = {
    ...snapshot,
    serviceWorkerRegistration: registration,
    serviceWorkerError: null,
  };

  observeWorker(registration.installing);
  observeWorker(registration.waiting);
  observeWorker(registration.active);

  if (!observedRegistrations.has(registration)) {
    observedRegistrations.add(registration);
    registration.addEventListener('updatefound', () => {
      observeWorker(registration.installing);
      emit();
    });
  }

  if (registrationChanged || errorCleared) emit();
};

const validateServiceWorkerAsset = async () => {
  const response = await fetch(EXPECTED_SW_PATH, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept: 'application/javascript, text/javascript, */*;q=0.1' },
  });

  if (!response.ok) {
    throw new Error(`Service worker asset returned HTTP ${response.status}`);
  }

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const prefix = (await response.clone().text()).slice(0, 160).toLowerCase();
  if (contentType.includes('text/html') || prefix.includes('<!doctype html') || prefix.includes('<html')) {
    throw new Error('Service worker asset returned text/html instead of JavaScript');
  }
};

const clearLegacyPwaCaches = async () => {
  if (!('caches' in window)) return;
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => /workbox-precache|kourosh-large-static-assets|vite-pwa/i.test(name))
        .map((name) => caches.delete(name)),
    );
  } catch (error) {
    console.warn('[pwa] Could not clear legacy caches:', error);
  }
};

const unregisterBrokenOriginRegistrations = async (forceAll = false) => {
  if (!('serviceWorker' in navigator) || typeof navigator.serviceWorker.getRegistrations !== 'function') return false;

  const registrations = await navigator.serviceWorker.getRegistrations();
  let removed = false;
  for (const registration of registrations) {
    if (!registration.scope.startsWith(window.location.origin)) continue;
    const workers = [registration.installing, registration.waiting, registration.active].filter(Boolean) as ServiceWorker[];
    const hasExpectedWorker = workers.some(workerUsesExpectedScript);
    const stale = workers.length === 0 || !hasExpectedWorker;
    if (!forceAll && !stale) continue;
    try {
      removed = (await registration.unregister()) || removed;
    } catch (error) {
      console.warn('[pwa] Could not unregister a stale registration:', error);
    }
  }
  return removed;
};

const waitForController = async (timeoutMs = 7000) => {
  if (navigator.serviceWorker.controller) return true;
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      resolve(value);
    };
    const onControllerChange = () => finish(Boolean(navigator.serviceWorker.controller));
    const timer = window.setTimeout(() => finish(Boolean(navigator.serviceWorker.controller)), timeoutMs);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  });
};

const registerExpectedServiceWorker = async (allowRecovery = true): Promise<ServiceWorkerRegistration | null> => {
  try {
    await validateServiceWorkerAsset();
    await unregisterBrokenOriginRegistrations(false);

    const registration = await navigator.serviceWorker.register(EXPECTED_SW_PATH, {
      scope: '/',
      updateViaCache: 'none',
    });
    attachRegistration(registration);

    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
    const ready = await Promise.race<ServiceWorkerRegistration | null>([
      navigator.serviceWorker.ready.then((value) => value),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 9000)),
    ]);
    if (ready) attachRegistration(ready);

    try { sessionStorage.removeItem(REGISTRATION_RECOVERY_KEY); } catch { /* optional storage */ }
    return ready || registration;
  } catch (error) {
    const raw = errorText(error).toLowerCase();
    const recoverable = raw.includes('invalid state') || raw.includes("script ('unknown')") || raw.includes('unknown');
    let alreadyRecovered = false;
    try {
      alreadyRecovered = sessionStorage.getItem(REGISTRATION_RECOVERY_KEY) === '1';
    } catch {
      alreadyRecovered = false;
    }

    if (allowRecovery && recoverable && !alreadyRecovered) {
      try { sessionStorage.setItem(REGISTRATION_RECOVERY_KEY, '1'); } catch { /* optional storage */ }
      await unregisterBrokenOriginRegistrations(true);
      await clearLegacyPwaCaches();
      snapshot = { ...snapshot, serviceWorkerRegistration: null, serviceWorkerError: null };
      emit();
      return registerExpectedServiceWorker(false);
    }

    setServiceWorkerError(error);
    return null;
  }
};

const ensureRegistration = () => {
  if (!registrationPromise) {
    registrationPromise = registerExpectedServiceWorker().finally(() => {
      registrationPromise = null;
    });
  }
  return registrationPromise;
};

const registerProductionServiceWorker = () => {
  if (
    typeof window === 'undefined' ||
    !import.meta.env.PROD ||
    !window.isSecureContext ||
    !('serviceWorker' in navigator)
  ) return;
  void ensureRegistration();
};


const detectInstalledRelatedApp = async (): Promise<boolean | null> => {
  const nav = navigator as NavigatorWithPwaCapabilities;
  if (typeof nav.getInstalledRelatedApps !== 'function') return null;
  try {
    const relatedApps = await nav.getInstalledRelatedApps();
    return relatedApps.some((app) => app.platform === 'webapp');
  } catch (error) {
    console.warn('[pwa] Installed related app detection failed:', error);
    return null;
  }
};

const refreshInstalledState = async () => {
  const standalone = isStandalone();
  if (standalone) {
    writeInstalledMarker(true);
    if (!snapshot.installed || !snapshot.installationChecked) {
      snapshot = { ...snapshot, installed: true, installationChecked: true, deferredPrompt: null };
      emit();
    }
    return true;
  }

  const relatedAppInstalled = await detectInstalledRelatedApp();
  if (relatedAppInstalled !== null) {
    writeInstalledMarker(relatedAppInstalled);
    if (snapshot.installed !== relatedAppInstalled || !snapshot.installationChecked) {
      snapshot = {
        ...snapshot,
        installed: relatedAppInstalled,
        installationChecked: true,
        deferredPrompt: relatedAppInstalled ? null : snapshot.deferredPrompt,
      };
      emit();
    }
    return relatedAppInstalled;
  }

  const markerInstalled = readInstalledMarker();
  if (snapshot.installed !== markerInstalled || !snapshot.installationChecked) {
    snapshot = { ...snapshot, installed: markerInstalled, installationChecked: true };
    emit();
  }
  return markerInstalled;
};

const initialiseManager = () => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  const initiallyInstalled = isStandalone() || readInstalledMarker();
  snapshot = { ...snapshot, installed: initiallyInstalled, installationChecked: initiallyInstalled };
  void refreshInstalledState();

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    writeInstalledMarker(false);
    snapshot = {
      ...snapshot,
      installed: false,
      installationChecked: true,
      deferredPrompt: event as BeforeInstallPromptEvent,
    };
    emit();
  });

  window.addEventListener('appinstalled', () => {
    writeInstalledMarker(true);
    snapshot = { ...snapshot, installed: true, installationChecked: true, deferredPrompt: null };
    emit();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refreshInstalledState();
  });
  window.addEventListener('pageshow', () => void refreshInstalledState());
  window.addEventListener('focus', () => void refreshInstalledState());

  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    snapshot = { ...snapshot, serviceWorkerError: null };
    emit();
  });

  registerProductionServiceWorker();
};

const subscribe = (subscriber: () => void) => {
  initialiseManager();
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
};

const readManifest = async () => {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!link?.href) return { available: false, installable: false, url: null as string | null };

  try {
    const response = await fetch(link.href, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) return { available: false, installable: false, url: link.href };
    const manifest = await response.json() as {
      id?: string;
      name?: string;
      short_name?: string;
      start_url?: string;
      display?: string;
      icons?: Array<{ sizes?: string; src?: string; type?: string }>;
      prefer_related_applications?: boolean;
    };
    const sizes = new Set(
      (manifest.icons || [])
        .flatMap((icon) => String(icon.sizes || '').split(/\s+/))
        .filter(Boolean),
    );
    const displayAllowed = ['standalone', 'fullscreen', 'minimal-ui'].includes(String(manifest.display || ''));
    const installable = Boolean(
      (manifest.name || manifest.short_name) &&
      manifest.start_url &&
      displayAllowed &&
      sizes.has('192x192') &&
      sizes.has('512x512') &&
      manifest.prefer_related_applications !== true,
    );
    return { available: true, installable, url: link.href };
  } catch {
    return { available: false, installable: false, url: link.href };
  }
};

const readRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.getRegistration(expectedScope());
    if (registration) {
      attachRegistration(registration);
      return registration;
    }
    if (registrationPromise) return await registrationPromise;
  } catch (error) {
    setServiceWorkerError(error);
  }
  return snapshot.serviceWorkerRegistration;
};

const deriveWorkerState = (registration: ServiceWorkerRegistration | null) => {
  if (navigator.serviceWorker?.controller) return 'controlling';
  if (registration?.active) return registration.active.state || 'active';
  if (registration?.waiting) return registration.waiting.state || 'waiting';
  if (registration?.installing) return registration.installing.state || 'installing';
  return snapshot.serviceWorkerError ? 'error' : 'missing';
};

const collectDiagnostics = async (): Promise<PwaDiagnostics> => {
  const serviceWorkerSupported = 'serviceWorker' in navigator;
  const registration = serviceWorkerSupported ? await readRegistration() : null;
  const manifest = await readManifest();
  const worker = navigator.serviceWorker?.controller || registration?.active || registration?.waiting || registration?.installing || null;

  return {
    secureContext: window.isSecureContext,
    productionRuntime: import.meta.env.PROD,
    serviceWorkerSupported,
    serviceWorkerRegistered: Boolean(registration),
    serviceWorkerActive: Boolean(registration?.active),
    serviceWorkerControlling: Boolean(navigator.serviceWorker?.controller),
    serviceWorkerWaiting: Boolean(registration?.waiting),
    serviceWorkerInstalling: Boolean(registration?.installing),
    serviceWorkerState: deriveWorkerState(registration),
    serviceWorkerScriptUrl: worker?.scriptURL || null,
    serviceWorkerScope: registration?.scope || null,
    serviceWorkerError: snapshot.serviceWorkerError,
    manifestAvailable: manifest.available,
    manifestInstallable: manifest.installable,
    manifestUrl: manifest.url,
  };
};


export const inspectPwaRuntime = async ({ onProgress }: ResetPwaRuntimeOptions = {}): Promise<PwaResetResult> => {
  initialiseManager();

  let diagnostics: PwaDiagnostics | null = null;
  let manifestValid = false;
  let workerAssetValid = false;

  try {
    reportPwaResetProgress(onProgress, 'registrations', 'اتصال نسخه نصب‌شده', 'running', 'در حال بررسی اتصال نسخه نصب‌شده…');
    diagnostics = await collectDiagnostics();

    if (!diagnostics.secureContext) {
      reportPwaResetProgress(
        onProgress,
        'registrations',
        'اتصال نسخه نصب‌شده',
        'error',
        'اتصال این صفحه امن نیست؛ نصب برنامه فقط از یک نشانی امن امکان‌پذیر است.',
      );
    } else if (!diagnostics.serviceWorkerSupported) {
      reportPwaResetProgress(onProgress, 'registrations', 'اتصال نسخه نصب‌شده', 'error', 'قابلیت نصب برنامه در این مرورگر پشتیبانی نمی‌شود.');
    } else if (diagnostics.serviceWorkerRegistered) {
      reportPwaResetProgress(
        onProgress,
        'registrations',
        'اتصال نسخه نصب‌شده',
        'success',
        diagnostics.serviceWorkerScope ? `اتصال نسخه نصب‌شده فعال است.` : 'اتصال نسخه نصب‌شده فعال است.',
      );
    } else {
      reportPwaResetProgress(
        onProgress,
        'registrations',
        'اتصال نسخه نصب‌شده',
        'warning',
        diagnostics.productionRuntime
          ? 'اتصال فعالی برای نسخه نصب‌شده پیدا نشد؛ بازنشانی کامل می‌تواند آن را دوباره فعال کند.'
          : 'در این نسخه، فعال‌سازی خودکار نصب برنامه انجام نمی‌شود.',
      );
    }

    reportPwaResetProgress(onProgress, 'caches', 'فایل‌های ذخیره‌شده برنامه', 'running', 'در حال بررسی فایل‌های ذخیره‌شده برنامه…');
    if (!('caches' in window)) {
      reportPwaResetProgress(onProgress, 'caches', 'فایل‌های ذخیره‌شده برنامه', 'warning', 'فضای ذخیره‌سازی برنامه در این مرورگر در دسترس نیست.');
    } else {
      try {
        const cacheNames = await caches.keys();
        reportPwaResetProgress(
          onProgress,
          'caches',
          'فایل‌های ذخیره‌شده برنامه',
          'success',
          cacheNames.length > 0 ? `${cacheNames.length} مجموعه فایل ذخیره‌شده موجود است.` : 'فایل ذخیره‌شده فعالی وجود ندارد؛ این وضعیت می‌تواند طبیعی باشد.',
        );
      } catch (error) {
        reportPwaResetProgress(onProgress, 'caches', 'فایل‌های ذخیره‌شده برنامه', 'warning', `بررسی فایل‌های ذخیره‌شده ممکن نشد: ${errorText(error)}`);
      }
    }

    reportPwaResetProgress(onProgress, 'manifest', 'اطلاعات نصب برنامه', 'running', 'در حال بررسی اطلاعات و آیکون‌های نصب برنامه…');
    const manifest = await readManifest();
    manifestValid = manifest.available && manifest.installable;
    reportPwaResetProgress(
      onProgress,
      'manifest',
      'اطلاعات نصب برنامه',
      manifestValid ? 'success' : 'error',
      manifestValid
        ? 'اطلاعات و آیکون‌های لازم برای نصب برنامه معتبر هستند.'
        : manifest.available
          ? 'اطلاعات نصب دریافت شد اما شرایط لازم برای نصب کامل نیست.'
          : 'اطلاعات نصب برنامه از این نسخه دریافت نشد.',
    );

    reportPwaResetProgress(onProgress, 'worker-asset', 'سرویس اجرای برنامه', 'running', 'در حال بررسی سرویس اجرای نسخه نصب‌شده…');
    try {
      await validateServiceWorkerAsset();
      workerAssetValid = true;
      reportPwaResetProgress(onProgress, 'worker-asset', 'سرویس اجرای برنامه', 'success', 'سرویس اجرای نسخه نصب‌شده با پاسخ معتبر در دسترس است.');
    } catch (error) {
      reportPwaResetProgress(onProgress, 'worker-asset', 'سرویس اجرای برنامه', 'error', friendlyServiceWorkerError(error));
    }

    reportPwaResetProgress(onProgress, 'registration', 'فعال‌سازی نسخه تازه', 'running', 'در حال بررسی وضعیت نسخه فعال برنامه…');
    if (!diagnostics.serviceWorkerSupported) {
      reportPwaResetProgress(onProgress, 'registration', 'فعال‌سازی نسخه تازه', 'error', 'فعال‌سازی نسخه تازه در این مرورگر امکان‌پذیر نیست.');
    } else if (diagnostics.serviceWorkerActive) {
      reportPwaResetProgress(onProgress, 'registration', 'فعال‌سازی نسخه تازه', 'success', `نسخه فعال برنامه آماده است.`);
    } else if (diagnostics.serviceWorkerInstalling || diagnostics.serviceWorkerWaiting) {
      reportPwaResetProgress(onProgress, 'registration', 'فعال‌سازی نسخه تازه', 'warning', `نسخه برنامه هنوز در حال آماده‌شدن است.`);
    } else if (diagnostics.serviceWorkerRegistered) {
      reportPwaResetProgress(onProgress, 'registration', 'فعال‌سازی نسخه تازه', 'warning', 'اتصال نسخه نصب‌شده وجود دارد اما هنوز آماده اجرا نیست.');
    } else {
      reportPwaResetProgress(
        onProgress,
        'registration',
        'فعال‌سازی نسخه تازه',
        'warning',
        diagnostics.productionRuntime ? 'نسخه نصب‌شده هنوز فعال نشده است.' : 'در این نسخه، فعال‌سازی خودکار نصب برنامه انجام نمی‌شود.',
      );
    }

    reportPwaResetProgress(onProgress, 'controller', 'آمادگی اجرای صفحه', 'running', 'در حال بررسی آمادگی اجرای نسخه نصب‌شده…');
    if (diagnostics.serviceWorkerControlling) {
      reportPwaResetProgress(onProgress, 'controller', 'آمادگی اجرای صفحه', 'success', 'صفحه با نسخه فعال برنامه هماهنگ است.');
    } else if (diagnostics.serviceWorkerActive) {
      reportPwaResetProgress(onProgress, 'controller', 'آمادگی اجرای صفحه', 'warning', 'نسخه تازه فعال است اما این صفحه هنوز به‌روزرسانی نشده؛ یک بارگذاری مجدد لازم است.');
    } else {
      reportPwaResetProgress(
        onProgress,
        'controller',
        'آمادگی اجرای صفحه',
        'warning',
        diagnostics.productionRuntime ? 'نسخه نصب‌شده هنوز کنترل این صفحه را در اختیار ندارد.' : 'در این نسخه، کنترل نصب‌شده صفحه فعال نیست.',
      );
    }

    const success = Boolean(
      diagnostics.secureContext &&
      diagnostics.serviceWorkerSupported &&
      diagnostics.serviceWorkerRegistered &&
      diagnostics.serviceWorkerActive &&
      diagnostics.serviceWorkerControlling &&
      manifestValid &&
      workerAssetValid,
    );

    return {
      success,
      requiresReload: false,
      message: success
        ? 'بررسی نصب کامل شد؛ نسخه نصب‌شده آماده و فعال است.'
        : 'بررسی نصب کامل شد؛ جزئیات هر مرحله را ببینید. اگر خطا یا هشدار باقی ماند، بازنشانی کامل برنامه را اجرا کنید.',
      diagnostics,
    };
  } catch (error) {
    const detail = friendlyServiceWorkerError(error);
    return {
      success: false,
      requiresReload: false,
      message: `بررسی نصب برنامه کامل نشد: ${detail}`,
      diagnostics: diagnostics || await collectDiagnostics().catch(() => null),
    };
  }
};

const PWA_RESET_STORAGE_KEYS = [
  CONTROL_RELOAD_KEY,
  REGISTRATION_RECOVERY_KEY,
  'pwa_install_overlay_dismissed_v2',
  PWA_RESET_COMPLETED_STORAGE_KEY,
] as const;

const reportPwaResetProgress = (
  callback: ResetPwaRuntimeOptions['onProgress'],
  id: PwaResetStepId,
  label: string,
  status: PwaResetStepStatus,
  detail: string,
) => {
  callback?.({ id, label, status, detail });
};

const clearPwaStorageMarkers = () => {
  for (const key of PWA_RESET_STORAGE_KEYS) {
    try { sessionStorage.removeItem(key); } catch { /* optional storage */ }
    try { localStorage.removeItem(key); } catch { /* optional storage */ }
  }
};

const clearAllOriginCaches = async () => {
  if (!('caches' in window)) return 0;
  const names = await caches.keys();
  const deleted = await Promise.all(names.map((name) => caches.delete(name)));
  return deleted.filter(Boolean).length;
};

const unregisterAllOriginRegistrations = async () => {
  if (!('serviceWorker' in navigator) || typeof navigator.serviceWorker.getRegistrations !== 'function') return 0;
  const registrations = await navigator.serviceWorker.getRegistrations();
  let removed = 0;
  for (const registration of registrations) {
    if (!registration.scope.startsWith(window.location.origin)) continue;
    try {
      if (await registration.unregister()) removed += 1;
    } catch (error) {
      console.warn('[pwa] Could not unregister registration during full reset:', error);
    }
  }
  return removed;
};

export const resetPwaRuntime = async ({ onProgress }: ResetPwaRuntimeOptions = {}): Promise<PwaResetResult> => {
  initialiseManager();

  if (!('serviceWorker' in navigator)) {
    const message = 'قابلیت نصب برنامه در این مرورگر پشتیبانی نمی‌شود.';
    reportPwaResetProgress(onProgress, 'registrations', 'اتصال نسخه نصب‌شده', 'error', message);
    return { success: false, requiresReload: false, message, diagnostics: null };
  }

  try {
    reportPwaResetProgress(onProgress, 'registrations', 'اتصال نسخه نصب‌شده', 'running', 'در حال پاک‌سازی اتصال نسخه نصب‌شده…');
    if (registrationPromise) {
      try { await registrationPromise; } catch { /* reset continues */ }
      registrationPromise = null;
    }
    const removedRegistrations = await unregisterAllOriginRegistrations();
    snapshot = {
      ...snapshot,
      deferredPrompt: null,
      serviceWorkerRegistration: null,
      serviceWorkerError: null,
    };
    emit();
    reportPwaResetProgress(
      onProgress,
      'registrations',
      'اتصال نسخه نصب‌شده',
      'success',
      removedRegistrations > 0 ? `${removedRegistrations} اتصال قبلی پاک‌سازی شد.` : 'اتصال قبلی فعالی وجود نداشت.',
    );

    reportPwaResetProgress(onProgress, 'caches', 'فایل‌های ذخیره‌شده برنامه', 'running', 'در حال پاک‌سازی فایل‌های ذخیره‌شده و اطلاعات نصب…');
    const deletedCaches = await clearAllOriginCaches();
    clearPwaStorageMarkers();
    reportPwaResetProgress(
      onProgress,
      'caches',
      'فایل‌های ذخیره‌شده برنامه',
      'success',
      deletedCaches > 0 ? `${deletedCaches} مجموعه فایل ذخیره‌شده پاک شد.` : 'فایل ذخیره‌شده قدیمی برای حذف وجود نداشت.',
    );

    reportPwaResetProgress(onProgress, 'manifest', 'اطلاعات نصب برنامه', 'running', 'در حال دریافت و بررسی اطلاعات تازه نصب…');
    const manifest = await readManifest();
    if (!manifest.available || !manifest.installable) {
      const detail = manifest.available
        ? 'اطلاعات نصب دریافت شد اما شرایط لازم برای نصب کامل نیست.'
        : 'اطلاعات نصب از نسخه اصلی برنامه دریافت نشد.';
      reportPwaResetProgress(onProgress, 'manifest', 'اطلاعات نصب برنامه', 'error', detail);
      return { success: false, requiresReload: false, message: detail, diagnostics: await collectDiagnostics() };
    }
    reportPwaResetProgress(onProgress, 'manifest', 'اطلاعات نصب برنامه', 'success', 'اطلاعات و آیکون‌های نصب معتبر هستند.');

    reportPwaResetProgress(onProgress, 'worker-asset', 'سرویس اجرای برنامه', 'running', 'در حال بررسی سرویس اجرای نسخه نصب‌شده…');
    await validateServiceWorkerAsset();
    reportPwaResetProgress(onProgress, 'worker-asset', 'سرویس اجرای برنامه', 'success', 'سرویس اجرای نسخه نصب‌شده با پاسخ معتبر در دسترس است.');

    reportPwaResetProgress(onProgress, 'registration', 'فعال‌سازی مجدد', 'running', 'در حال فعال‌سازی نسخه تازه برنامه…');
    const registration = await registerExpectedServiceWorker(false);
    if (!registration) {
      const detail = snapshot.serviceWorkerError || 'فعال‌سازی مجدد نسخه نصب‌شده کامل نشد.';
      reportPwaResetProgress(onProgress, 'registration', 'فعال‌سازی مجدد', 'error', detail);
      return { success: false, requiresReload: false, message: detail, diagnostics: await collectDiagnostics() };
    }
    reportPwaResetProgress(onProgress, 'registration', 'فعال‌سازی مجدد', 'success', 'نسخه تازه برنامه فعال شد.');

    reportPwaResetProgress(onProgress, 'controller', 'آمادگی اجرای صفحه', 'running', 'در حال هماهنگ‌سازی صفحه با نسخه تازه…');
    const controlled = await waitForController(5000);
    const diagnostics = await collectDiagnostics();
    const controllerReady = controlled && diagnostics.serviceWorkerControlling;
    reportPwaResetProgress(
      onProgress,
      'controller',
      'آمادگی اجرای صفحه',
      controllerReady ? 'success' : 'warning',
      controllerReady
        ? 'صفحه با نسخه تازه برنامه هماهنگ شد.'
        : 'نسخه تازه فعال است؛ برای اعمال آن یک بارگذاری مجدد لازم است.',
    );

    try { sessionStorage.setItem(PWA_RESET_COMPLETED_STORAGE_KEY, '1'); } catch { /* optional storage */ }
    const message = controllerReady
      ? 'بازنشانی برنامه کامل شد؛ صفحه برای بررسی دوباره نصب یک‌بار بارگذاری مجدد می‌شود.'
      : 'بازنشانی برنامه کامل شد؛ صفحه برای فعال‌شدن نسخه تازه یک‌بار بارگذاری مجدد می‌شود.';
    return { success: true, requiresReload: true, message, diagnostics };
  } catch (error) {
    const detail = friendlyServiceWorkerError(error);
    setServiceWorkerError(error);
    reportPwaResetProgress(onProgress, 'registration', 'فعال‌سازی مجدد', 'error', detail);
    return { success: false, requiresReload: false, message: detail, diagnostics: await collectDiagnostics().catch(() => null) };
  }
};

const isIOS = () => detectPwaPlatform().id === 'ios';
const isInAppBrowser = () => {
  const userAgent = window.navigator.userAgent;
  const referrer = String(document.referrer || '');
  return /instagram|fbav|fb_iab|fban|line|snapchat|telegram|whatsapp|;\s*wv\)/i.test(userAgent) || referrer.startsWith('android-app://');
};

export const usePwaInstall = () => {
  const [, setRevision] = useState(0);
  const [diagnostics, setDiagnostics] = useState<PwaDiagnostics | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => subscribe(() => setRevision((value) => value + 1)), []);

  const refreshDiagnostics = useCallback(async () => {
    setChecking(true);
    try {
      const result = await collectDiagnostics();
      setDiagnostics(result);
      return result;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void refreshDiagnostics();
  }, [refreshDiagnostics, snapshot.revision]);

  const prepareServiceWorker = useCallback(async (): Promise<ServiceWorkerPrepareOutcome> => {
    initialiseManager();
    if (!('serviceWorker' in navigator)) return 'unsupported';

    try {
      let registration = await readRegistration();
      if (!registration || snapshot.serviceWorkerError) {
        await unregisterBrokenOriginRegistrations(true);
        await clearLegacyPwaCaches();
        snapshot = { ...snapshot, serviceWorkerRegistration: null, serviceWorkerError: null };
        emit();
        registration = await registerExpectedServiceWorker(false);
      }
      if (!registration) return 'error';

      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      if (navigator.serviceWorker.controller) {
        try { sessionStorage.removeItem(CONTROL_RELOAD_KEY); } catch { /* optional */ }
        return 'controlled';
      }

      const controlled = await waitForController();
      if (controlled) {
        try { sessionStorage.removeItem(CONTROL_RELOAD_KEY); } catch { /* optional */ }
        return 'controlled';
      }

      const activeRegistration = await readRegistration();
      if (activeRegistration?.active) {
        let alreadyReloaded = false;
        try {
          alreadyReloaded = sessionStorage.getItem(CONTROL_RELOAD_KEY) === '1';
          if (!alreadyReloaded) sessionStorage.setItem(CONTROL_RELOAD_KEY, '1');
        } catch {
          alreadyReloaded = false;
        }
        if (!alreadyReloaded) {
          window.location.reload();
          return 'reloading';
        }
      }

      return 'pending';
    } catch (error) {
      setServiceWorkerError(error);
      return 'error';
    }
  }, []);

  const requestInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (snapshot.installed || isStandalone()) return 'already-installed';
    if (isIOS()) return 'ios-help';
    const promptEvent = snapshot.deferredPrompt;
    if (!promptEvent) {
      await refreshDiagnostics();
      return 'unavailable';
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      writeInstalledMarker(true);
      snapshot = { ...snapshot, installed: true, installationChecked: true, deferredPrompt: null };
    } else {
      snapshot = { ...snapshot, deferredPrompt: null, installationChecked: true };
    }
    emit();
    return choice.outcome;
  }, [refreshDiagnostics]);

  return {
    deferredPrompt: snapshot.deferredPrompt,
    installed: snapshot.installed,
    installationChecked: snapshot.installationChecked,
    platform: useMemo(() => detectPwaPlatform(), []),
    installReady: Boolean(snapshot.deferredPrompt),
    ios: useMemo(() => isIOS(), []),
    inAppBrowser: useMemo(() => isInAppBrowser(), []),
    diagnostics,
    checking,
    refreshDiagnostics,
    prepareServiceWorker,
    requestInstall,
  };
};

if (typeof window !== 'undefined') initialiseManager();

export default usePwaInstall;
