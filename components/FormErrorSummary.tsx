import React from 'react';
import { getRecoveryHint } from '../utils/feedback';
import { focusFirstError } from '../utils/focusFirstError';

export type FormErrors = Record<string, string>;

type Props = {
  errors: FormErrors;
  /** Map error keys to human labels, for nicer display */
  labels?: Record<string, string>;
  /** Map error keys to DOM element ids for scrolling/focus */
  fieldIdMap?: Record<string, string>;
  className?: string;
};


const FormErrorSummary: React.FC<Props> = ({ errors, labels, fieldIdMap, className }) => {
  const keys = Object.keys(errors || {});
  if (keys.length === 0) return null;

  return (
    <div role="alert" aria-live="polite" data-ui-surface="form-error-summary" data-ui-card="true" className={`app-card form-error-summary ux-validation-summary rounded-[26px] border border-red-200/70 bg-red-50/70 p-4 md:p-5 dark:border-red-900/40 dark:bg-red-950/20 ${className || ''}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-right">
          <div className="flex items-center justify-end gap-2 text-red-700 dark:text-red-200 text-sm font-black">
            <span>{keys.length} مورد نیاز به اصلاح</span>
            <i className="fa-solid fa-triangle-exclamation" />
          </div>
          <p className="mt-1 text-xs leading-6 text-red-700/80 dark:text-red-200/80">
            قبل از ثبت اطلاعات نهایی، روی هر مورد بزنید تا همان فیلد برای اصلاح باز شود.
          </p>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl detail-severity-panel text-red-500 shadow-sm">
          <i className="fa-solid fa-file-circle-exclamation" />
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {keys.map((k) => {
          const label = labels?.[k] || k;
          const msg = errors[k];
          return (
            <li key={k}>
              <button
                type="button"
                onClick={() => focusFirstError({ [k]: msg }, fieldIdMap)}
                className="form-error-summary__item ux-validation-summary__item w-full rounded-2xl detail-severity-panel px-3 py-2 text-right transition hover:border-red-300/70 hover:bg-red-50/30 dark:hover:bg-red-950/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="ux-validation-summary__item-icon mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                    <i className="fa-solid fa-location-crosshairs text-[11px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</div>
                    <div className="mt-1 text-xs leading-6 text-red-700 dark:text-red-200">{msg}</div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 rounded-2xl detail-severity-panel px-3 py-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
        <span className="font-bold text-slate-800 dark:text-slate-100">راهنمای سریع:</span>{' '}
        {getRecoveryHint(Object.values(errors).join(' | '))}
      </div>
    </div>
  );
};

export default FormErrorSummary;
