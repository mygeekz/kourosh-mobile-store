/**
 * Development/runtime cache cleanup kept out of index.tsx.
 *
 * This preserves the existing behavior: in local/dev hosts, unregister service
 * workers and clear browser caches so old PWA assets do not mask fresh builds.
 */
export function clearLocalRuntimeCaches(): void {
  if (!isLocalRuntime()) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  void navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => undefined);

  if (typeof window !== 'undefined' && 'caches' in window) {
    void caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => undefined);
  }
}

function isLocalRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return import.meta.env.DEV || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal');
}
