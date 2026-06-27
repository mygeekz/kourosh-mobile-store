import React from 'react';

const ALLOW_NATIVE_SUBMIT_SELECTOR = [
  '[data-allow-native-submit="true"]',
  '[data-native-submit="true"]',
  '[data-kourosh-native-submit="true"]',
].join(',');

const isElement = (value: unknown): value is Element => value instanceof Element;

const shouldAllowNativeSubmit = (form: HTMLFormElement): boolean => {
  if (form.matches(ALLOW_NATIVE_SUBMIT_SELECTOR)) return true;

  const target = (form.getAttribute('target') || '').trim();
  if (target && target !== '_self') return true;

  const method = (form.getAttribute('method') || 'get').trim().toLowerCase();
  const action = (form.getAttribute('action') || '').trim();

  // Explicit off-app form posts/downloads are allowed only when the form says so through target/action.
  if (action) {
    try {
      const actionUrl = new URL(action, window.location.href);
      const currentUrl = new URL(window.location.href);
      const sameDocument = actionUrl.origin === currentUrl.origin && actionUrl.pathname === currentUrl.pathname && actionUrl.hash === currentUrl.hash;
      if (!sameDocument && method === 'post') return true;
    } catch {
      // If the action URL cannot be parsed, keep the SPA safe and block the native navigation.
      return false;
    }
  }

  return false;
};

/**
 * Prevents accidental full document navigations inside the SPA.
 *
 * Some legacy native buttons live inside forms without an explicit `type="button"`.
 * Browsers treat those as submit buttons and reload the current hash route. The app then
 * shows a global toast over a temporarily blank/loading page. This guard keeps those
 * interactions in-place while still allowing opt-in native forms.
 */
const SpaNavigationGuard: React.FC = () => {
  React.useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const normalizeLegacyButtons = (root: ParentNode = document) => {
      root.querySelectorAll<HTMLButtonElement>('form button:not([type])').forEach((button) => {
        const form = button.closest('form');
        if (!form || shouldAllowNativeSubmit(form)) return;
        button.setAttribute('type', 'button');
        button.setAttribute('data-spa-normalized-button', 'true');
      });
    };

    normalizeLegacyButtons();

    const clickGuard = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!isElement(target)) return;

      const button = target.closest<HTMLButtonElement>('button');
      if (button) {
        const form = button.closest('form');
        if (form && !shouldAllowNativeSubmit(form) && !button.hasAttribute('type')) {
          button.setAttribute('type', 'button');
          button.setAttribute('data-spa-normalized-button', 'true');
        }
      }

      const anchor = target.closest<HTMLAnchorElement>('a[href]');
      if (!anchor) return;
      if (anchor.matches('[data-allow-native-navigation="true"], [download]')) return;
      const href = (anchor.getAttribute('href') || '').trim();
      if (href === '' || href === '#') {
        event.preventDefault();
      }
    };

    const submitGuard = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || event.defaultPrevented || shouldAllowNativeSubmit(form)) return;

      event.preventDefault();
      event.stopPropagation();
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn('[kourosh] prevented accidental native form submit/reload', form);
      }
    };

    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) normalizeLegacyButtons(node);
        });
      }
    });

    document.addEventListener('click', clickGuard, true);
    document.addEventListener('submit', submitGuard);
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('click', clickGuard, true);
      document.removeEventListener('submit', submitGuard);
      mutationObserver.disconnect();
    };
  }, []);

  return null;
};

export default SpaNavigationGuard;
