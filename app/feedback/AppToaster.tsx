import React from 'react';
import { Toaster, resolveValue, toast as hotToast } from 'react-hot-toast';

const getToastUi = (type?: string) => {
  switch (type) {
    case 'success':
      return {
        title: 'با موفقیت انجام شد',
        icon: 'fa-circle-check',
        wrap: 'border-emerald-200/90 bg-white/95 text-slate-900 dark:border-emerald-900/40 dark:bg-slate-950/95 dark:text-slate-100',
        iconWrap: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/40',
        progress: 'from-emerald-400 via-cyan-400 to-sky-500 dark:from-emerald-300 dark:via-cyan-300 dark:to-sky-300',
      };
    case 'error':
      return {
        title: 'در انجام عملیات مشکلی ایجاد شد',
        icon: 'fa-circle-exclamation',
        wrap: 'border-rose-200/90 bg-white/95 text-slate-900 dark:border-rose-900/40 dark:bg-slate-950/95 dark:text-slate-100',
        iconWrap: 'bg-rose-50 text-rose-600 ring-1 ring-rose-100 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/40',
        progress: 'from-rose-400 via-orange-400 to-amber-400 dark:from-rose-300 dark:via-orange-300 dark:to-amber-300',
      };
    case 'loading':
      return {
        title: 'در حال انجام عملیات',
        icon: 'fa-spinner fa-spin',
        wrap: 'border-sky-200/90 bg-white/95 text-slate-900 dark:border-sky-900/40 dark:bg-slate-950/95 dark:text-slate-100',
        iconWrap: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100 dark:bg-sky-950/30 dark:text-sky-300 dark:ring-sky-900/40',
        progress: 'from-sky-400 via-cyan-400 to-blue-500 dark:from-sky-300 dark:via-cyan-300 dark:to-blue-300',
      };
    case 'blank':
    default:
      return {
        title: 'اطلاع‌رسانی سیستم',
        icon: 'fa-bell',
        wrap: 'border-slate-200/90 bg-white/95 text-slate-900 dark:border-slate-800/60 dark:bg-slate-950/95 dark:text-slate-100',
        iconWrap: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800',
        progress: 'from-slate-400 via-sky-400 to-cyan-400 dark:from-slate-300 dark:via-sky-300 dark:to-cyan-300',
      };
  }
};




export const AppToaster: React.FC = () => {
  return (
<Toaster
  position="bottom-right"
  reverseOrder={false}
  gutter={14}
  containerStyle={{ zIndex: 2147483000, right: 20, bottom: 20, left: 'auto', top: 'auto' }}
  toastOptions={{
    duration: 4200,
    style: { background: 'transparent', boxShadow: 'none', padding: 0, maxWidth: 'none' },
    success: { duration: 3600 },
    error: { duration: 5400 },
    loading: { duration: 4500 },
  }}
>
  {(t) => {
    const ui = getToastUi(t.type);
    return (
      <div
        className={`pointer-events-auto w-[min(92vw,460px)] overflow-hidden rounded-[24px] border shadow-[0_25px_70px_-35px_rgba(15,23,42,0.42)] backdrop-blur-xl transition-all duration-300 ${ui.wrap} ${t.visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        data-ui-feedback-surface="toast"
        dir="rtl"
      >
        <div className="flex items-start gap-3 px-4 pb-3 pt-4">
          <div className={`mt-0.5 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${ui.iconWrap}`}>
            <i className={`fa-solid ${ui.icon} text-lg`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-black tracking-[-0.01em]">{ui.title}</div>
                <div className="mt-1 text-[13px] leading-6 text-slate-600 dark:text-slate-300">{resolveValue(t.message, t)}</div>
              </div>
              <button
                type="button"
                onClick={() => hotToast.dismiss(t.id)}
                className="app-command-button app-command-button--icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/80 text-slate-500 transition-all hover:border-slate-300 hover:text-slate-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
                data-ui-button="true"
                data-ui-variant="secondary"
                data-ui-size="icon"
                data-ui-global-toast-close="true"
                aria-label="بستن اعلان"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-wand-magic-sparkles" /> اعلان هوشمند سیستم</span>
              <span className="inline-flex items-center gap-1.5"><i className="fa-regular fa-clock" /> بستن خودکار</span>
            </div>
          </div>
        </div>
        <div className="h-1.5 w-full bg-slate-100/80 dark:bg-slate-800/80">
          <div className={`toast-progress-bar h-full w-full bg-gradient-to-r ${ui.progress}`} style={{ animationDuration: `${typeof t.duration === 'number' ? t.duration : 4200}ms`, animationPlayState: t.visible ? 'running' : 'paused' }} />
        </div>
      </div>
    );
  }}
</Toaster>
  );
};
