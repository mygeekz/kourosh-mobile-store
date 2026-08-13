import { MlOperatorDetailSections, getMlOperatorDetailTitle, type MlOperatorDetailSelection } from './MlOperatorDetailSections';

type MlOperatorDetailDrawerProps = {
  selection: MlOperatorDetailSelection | null;
  open: boolean;
  onClose: () => void;
};

const safetyBadges = ['فراداده محدود', 'فقط خواندنی', 'بدون اجرای مدل', 'بدون پیش‌بینی زنده', 'بدون فعال‌سازی آرتیفکت', 'بدون تغییر کسب‌وکار'];

export function MlOperatorDetailDrawer({ selection, open, onClose }: MlOperatorDetailDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] min-h-0 overflow-hidden" dir="rtl" data-report-drawer-frame="ml-operator" data-ml-operator-detail-drawer-anchor="metadata-only-read-only-detail">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-[2px]"
        aria-label="بستن جزئیات پایش"
        onClick={onClose}
      />

      <aside className="absolute inset-y-0 left-0 flex min-h-0 max-h-dvh w-full max-w-3xl flex-col overflow-hidden border-r border-slate-200 bg-white shadow-[0_24px_70px_-36px_rgba(15,23,42,0.65)] dark:border-slate-800 dark:bg-slate-950 sm:m-4 sm:max-h-[calc(100dvh-2rem)] sm:max-w-[calc(100vw-2rem)] sm:rounded-[30px] sm:border" data-report-drawer-surface="true">
        <header className="border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                <i className="fa-solid fa-eye" />
                فقط خواندنی
              </div>
              <h2 className="text-xl font-black text-slate-950 dark:text-white">{getMlOperatorDetailTitle(selection)}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                این پنل فقط فراداده آماده را نمایش می‌دهد و هیچ عملیات اجرایی یا تغییر اطلاعاتی انجام نمی‌دهد.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
              aria-label="بستن"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {safetyBadges.map((badge) => (
              <span key={badge} className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-800">
                <i className="fa-solid fa-shield-halved" />
                {badge}
              </span>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <MlOperatorDetailSections selection={selection} />
        </div>

        <footer className="border-t border-slate-200 p-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[42px] w-full items-center justify-center gap-2 rounded-[18px] bg-slate-950 px-4 text-sm font-black text-white transition hover:-translate-y-0.5 dark:bg-white dark:text-slate-950 sm:w-auto"
          >
            <i className="fa-solid fa-arrow-right" />
            بازگشت به پایش
          </button>
        </footer>
      </aside>
    </div>
  );
}

export type { MlOperatorDetailSelection };
