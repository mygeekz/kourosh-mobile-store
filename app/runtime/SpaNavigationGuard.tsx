import React, { useEffect } from 'react';

const APP_FILE_OR_ASSET_PATH = /\.[a-z0-9]{1,8}$/i;
const NON_SPA_PREFIXES = ['/api/', '/assets/', '/icons/', '/fonts/'];

const isCanonicalHashRoute = (hash: string): boolean => hash === '#/' || hash.startsWith('#/');

export const resolveLegacySpaRedirect = (locationLike: Pick<Location, 'origin' | 'pathname' | 'search' | 'hash'>): string | null => {
  const pathname = String(locationLike.pathname || '/');
  const search = String(locationLike.search || '');
  const hash = String(locationLike.hash || '');

  if (isCanonicalHashRoute(hash)) return null;
  if (pathname === '/' || pathname === '/index.html') return null;
  if (APP_FILE_OR_ASSET_PATH.test(pathname)) return null;
  if (NON_SPA_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return `${locationLike.origin}/#${pathname}${search}`;
};

/**
 * Keeps legacy same-origin hard navigations compatible with the application's
 * canonical HashRouter runtime. Normal /#/ routes are untouched. If an older
 * caller opens an app path such as /customers directly, the production SPA
 * shell can still recover it once as /#/customers instead of landing on the
 * dashboard route after the server-side SPA fallback.
 */
const SpaNavigationGuard: React.FC = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const redirectUrl = resolveLegacySpaRedirect(window.location);
    if (!redirectUrl || redirectUrl === window.location.href) return;

    window.location.replace(redirectUrl);
  }, []);

  return null;
};

export default SpaNavigationGuard;
