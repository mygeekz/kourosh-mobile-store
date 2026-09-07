import React from 'react';
import { getRecoveryHint } from '../utils/feedback';
import { focusFirstError } from '../utils/focusFirstError';
import type { FormValidationErrors } from '@/components/ui';

export type FormErrors = FormValidationErrors;

type Props = {
  errors: FormErrors;
  /** Map error keys to human labels, for nicer display. */
  labels?: Record<string, string>;
  /** Map error keys to DOM element ids for scrolling/focus. */
  fieldIdMap?: Record<string, string>;
  className?: string;
};

const FormErrorSummary: React.FC<Props> = ({ errors, labels, fieldIdMap, className }) => {
  const keys = Object.keys(errors || {}).filter((key) => Boolean(errors[key]));
  const generatedId = React.useId().replace(/:/g, '');
  const titleId = `form-error-summary-${generatedId}`;
  if (keys.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-labelledby={titleId}
      data-ui-surface="form-error-summary"
      data-ui-validation-summary="true"
      data-ui-card="true"
      className={`app-card form-error-summary ux-validation-summary rounded-[var(--ds-radius-md)] border border-danger/30 bg-danger/10 p-3 sm:p-4 ${className || ''}`.trim()}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--ds-radius-sm)] bg-danger/10 text-danger" aria-hidden="true">
          <i className="fa-solid fa-file-circle-exclamation" />
        </span>
        <div className="min-w-0 flex-1 text-right">
          <div id={titleId} className="flex items-center gap-2 text-sm font-black text-danger">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            <span>{keys.length.toLocaleString('fa-IR')} مورد نیاز به اصلاح</span>
          </div>
          <p className="mt-1 text-xs font-semibold leading-6 text-muted-foreground">
            قبل از ثبت نهایی، موارد زیر را اصلاح کنید. انتخاب هر مورد، همان فیلد را در دسترس قرار می‌دهد.
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {keys.map((key) => {
          const label = labels?.[key] || key;
          const message = errors[key];
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => focusFirstError({ [key]: message }, fieldIdMap)}
                className="form-error-summary__item ux-validation-summary__item flex w-full min-w-0 items-start gap-3 rounded-[var(--ds-radius-sm)] border border-border bg-card px-3 py-2 text-right text-foreground transition-colors hover:border-danger/35 hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)]"
              >
                <span className="ux-validation-summary__item-icon mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--ds-radius-xs)] bg-danger/10 text-danger" aria-hidden="true">
                  <i className="fa-solid fa-location-crosshairs text-[11px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm font-bold text-foreground">{label}</strong>
                  <span className="mt-0.5 block text-xs font-semibold leading-6 text-danger">{message}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 rounded-[var(--ds-radius-sm)] border border-border bg-muted/60 px-3 py-2 text-xs font-semibold leading-6 text-muted-foreground">
        <span className="font-black text-foreground">راهنمای سریع:</span>{' '}
        {getRecoveryHint(Object.values(errors).join(' | '))}
      </p>
    </div>
  );
};

export default FormErrorSummary;
