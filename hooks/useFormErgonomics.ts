import { useEffect, useMemo, useRef } from "react";

type Options = {
  errorCount?: number;
  submitOnLastField?: boolean;
};

const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const ENTER_SKIP_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'file',
  'submit',
  'button',
  'reset',
]);

function isVisible(el: HTMLElement) {
  const style = window.getComputedStyle(el);
  return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
}

function getFocusable(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (!isVisible(el)) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    return true;
  });
}

export function useFormErgonomics(options: Options = {}) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const previousErrorCountRef = useRef(0);
  const { errorCount = 0, submitOnLastField = false } = options;

  useEffect(() => {
    const hadNoErrors = previousErrorCountRef.current === 0;
    previousErrorCountRef.current = errorCount;
    if (errorCount === 0 || !formRef.current) return;
    if (!hadNoErrors && errorCount === previousErrorCountRef.current) return;

    const form = formRef.current;
    const firstInvalid = form.querySelector<HTMLElement>("[aria-invalid='true']") ||
      form.querySelector<HTMLElement>('.modal-control-error, .app-error, [data-field-state="error"]');
    if (!firstInvalid) return;

    const target = typeof (firstInvalid as any).focus === 'function'
      ? firstInvalid
      : firstInvalid.querySelector<HTMLElement>('input,select,textarea,button,[tabindex]');

    const scrollTarget = target || firstInvalid;
    window.requestAnimationFrame(() => {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      scrollTarget.classList.add('ux-field-attention');
      window.setTimeout(() => scrollTarget.classList.remove('ux-field-attention'), 1400);
      if (target && typeof (target as any).focus === 'function') {
        window.setTimeout(() => (target as any).focus({ preventScroll: true }), 70);
      }
    });
  }, [errorCount]);

  const onKeyDownCapture = useMemo(() => {
    return (event: React.KeyboardEvent<HTMLFormElement>) => {
      if (event.key !== 'Enter' || event.defaultPrevented) return;
      if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const form = formRef.current;
      if (!target || !form) return;
      if (target.closest('[data-enter-submit="true"]')) return;

      const tag = target.tagName.toLowerCase();
      if (tag === 'textarea') return;
      if (tag === 'button') return;
      if (tag === 'a') return;
      if (target.getAttribute('role') === 'button') return;

      if (tag === 'input') {
        const type = ((target as HTMLInputElement).type || 'text').toLowerCase();
        if (ENTER_SKIP_INPUT_TYPES.has(type)) return;
      }

      const focusable = getFocusable(form).filter((el) => !el.closest('[data-skip-ergonomic-flow="true"]'));
      const currentIndex = focusable.indexOf(target);
      if (currentIndex === -1) return;

      const next = focusable.slice(currentIndex + 1).find((el) => {
        if (el.tagName.toLowerCase() === 'button') return false;
        return true;
      });

      if (next) {
        event.preventDefault();
        next.focus({ preventScroll: true });
        if (typeof (next as HTMLInputElement).select === 'function' && next.tagName.toLowerCase() === 'input') {
          try { (next as HTMLInputElement).select(); } catch {}
        }
        next.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      if (submitOnLastField) {
        event.preventDefault();
        form.requestSubmit();
      }
    };
  }, [submitOnLastField]);

  return { formRef, onKeyDownCapture };
}
