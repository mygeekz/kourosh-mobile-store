import React from 'react';

const RIPPLE_SELECTOR = '[data-ripple="true"], .ux-btn';
const INTERACTIVE_SELECTOR = 'button, [role="button"], a.ux-btn';

function shouldSkipRipple(target: HTMLElement | null) {
  if (!target) return true;
  if (target.matches('[disabled], [aria-disabled="true"], .no-ripple, [data-ripple="false"]')) return true;
  const computed = window.getComputedStyle(target);
  return computed.pointerEvents === 'none';
}

function updateLoadingStateForElement(el: HTMLElement | null) {
  if (!el || !el.matches(INTERACTIVE_SELECTOR)) return;
  const explicitLoading = el.getAttribute('aria-busy') === 'true' || el.dataset.loading === 'true';

  if (explicitLoading) {
    el.dataset.loading = 'true';
    el.setAttribute('aria-busy', 'true');
  } else if (el.dataset.loading === 'true') {
    delete el.dataset.loading;
    el.removeAttribute('aria-busy');
  }
}

function syncLoadingState(root: ParentNode | HTMLElement = document) {
  if (root instanceof HTMLElement) updateLoadingStateForElement(root);
  const nodes = root.querySelectorAll?.(INTERACTIVE_SELECTOR);
  nodes?.forEach((node) => updateLoadingStateForElement(node as HTMLElement));
}

const GlobalButtonEffects: React.FC = () => {
  React.useEffect(() => {
    let rafId: number | null = null;
    const queue = new Set<HTMLElement>();

    const flush = () => {
      rafId = null;
      const batch = Array.from(queue);
      queue.clear();
      batch.forEach((el) => syncLoadingState(el));
    };

    const schedule = (node?: HTMLElement | null) => {
      if (node) queue.add(node);
      if (rafId != null) return;
      rafId = window.requestAnimationFrame(flush);
    };

    const handlePointerDown = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const surface = target?.closest(RIPPLE_SELECTOR) as HTMLElement | null;
      if (!surface || shouldSkipRipple(surface)) return;

      const rect = surface.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 1.35;
      const ripple = document.createElement('span');
      ripple.className = 'ux-ripple';

      const source = 'clientX' in event ? (event as PointerEvent) : null;
      const left = source ? source.clientX - rect.left - size / 2 : rect.width / 2 - size / 2;
      const top = source ? source.clientY - rect.top - size / 2 : rect.height / 2 - size / 2;

      ripple.style.width = `${size}px`;
      ripple.style.height = `${size}px`;
      ripple.style.left = `${left}px`;
      ripple.style.top = `${top}px`;

      surface.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 650);
    };

    syncLoadingState(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) schedule(node);
          });
          continue;
        }

        if (mutation.type === 'attributes' && mutation.target instanceof HTMLElement) {
          const target = mutation.target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
          if (target) schedule(target);
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['disabled', 'aria-disabled', 'aria-busy', 'data-loading'],
    });

    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => {
      observer.disconnect();
      document.removeEventListener('pointerdown', handlePointerDown);
      if (rafId != null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return null;
};

export default GlobalButtonEffects;
