import type { FormErrors } from '../components/FormErrorSummary';

const cssEscape = (value: string) => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
};

const findFieldElement = (key: string, fieldIdMap?: Record<string, string>) => {
  const mapped = fieldIdMap?.[key] || key;
  const candidates = [mapped, key].filter(Boolean);

  for (const candidate of candidates) {
    const byId = document.getElementById(candidate);
    if (byId) return byId;
  }

  for (const candidate of candidates) {
    const escaped = cssEscape(candidate);
    const byAttr = document.querySelector(
      `[name="${escaped}"], [data-field-key="${escaped}"], [data-error-key="${escaped}"], [aria-describedby~="${escaped}"], [aria-describedby*="${escaped}"]`,
    ) as HTMLElement | null;
    if (byAttr) return byAttr;
  }

  const firstInvalid = document.querySelector('[aria-invalid="true"], .modal-field-premium--error, .form-field--error, .has-error') as HTMLElement | null;
  return firstInvalid;
};

const getScrollTarget = (el: HTMLElement) =>
  (el.closest('.modal-field-premium, .premium-field, .form-field, .app-field, section, .phone-identity-block__field, .phone-finance-block__field, .phone-operations-block__field') as HTMLElement | null) || el;

const getFocusable = (el: HTMLElement) =>
  (el.matches('input,select,textarea,button,[tabindex]') ? el : el.querySelector('input,select,textarea,button,[tabindex]')) as HTMLElement | null;

/**
 * Scroll/focus to the first error field.
 * Error keys are matched to id, name, data-field-key/data-error-key and fieldIdMap.
 */
export function focusFirstError(errors: FormErrors, fieldIdMap?: Record<string, string>) {
  const keys = Object.keys(errors || {}).filter((key) => Boolean(errors[key]));
  if (keys.length === 0) return;

  const firstKey = keys[0];
  const el = findFieldElement(firstKey, fieldIdMap);
  if (!el) return;

  const invalidChild = el.matches("[aria-invalid='true']") ? el : (el.querySelector("[aria-invalid='true']") as HTMLElement | null);
  const target = invalidChild || el;
  const scrollTarget = getScrollTarget(target);

  scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
  scrollTarget.classList.add('ux-field-attention');
  scrollTarget.setAttribute('data-validation-attention', 'true');
  target.classList.add('ux-field-attention-control');

  window.setTimeout(() => {
    scrollTarget.classList.remove('ux-field-attention');
    scrollTarget.removeAttribute('data-validation-attention');
    target.classList.remove('ux-field-attention-control');
  }, 1400);

  const focusable = getFocusable(target);
  if (focusable && typeof focusable.focus === 'function') {
    window.setTimeout(() => focusable.focus({ preventScroll: true }), 70);
  }
}
