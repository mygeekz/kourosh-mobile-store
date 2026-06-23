import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WidgetDef, WidgetId } from './registry';

type Props = {
  open: boolean;
  onClose: () => void;
  available: WidgetDef[];
  onAdd: (id: WidgetId) => void;
};

const accentToClasses = (accent: WidgetDef['accent']) => {
  switch (accent) {
    case 'emerald':
      return { bg: 'from-emerald-500/12 to-teal-500/10', icon: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-500/20' };
    case 'violet':
      return { bg: 'from-violet-500/12 to-fuchsia-500/10', icon: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-500/20' };
    case 'rose':
      return { bg: 'from-rose-500/12 to-pink-500/10', icon: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-500/20' };
    case 'sky':
      return { bg: 'from-sky-500/12 to-indigo-500/10', icon: 'text-sky-700 dark:text-sky-300', ring: 'ring-sky-500/20' };
    case 'amber':
      return { bg: 'from-amber-500/12 to-orange-500/10', icon: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-500/20' };
    case 'teal':
      return { bg: 'from-teal-500/12 to-cyan-500/10', icon: 'text-teal-700 dark:text-teal-300', ring: 'ring-teal-500/20' };
    case 'indigo':
    default:
      return { bg: 'from-indigo-500/12 to-fuchsia-500/10', icon: 'text-indigo-700 dark:text-indigo-300', ring: 'ring-indigo-500/20' };
  }
};

export default function AddWidgetModal({ open, onClose, available, onAdd }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('همه');

  const categories = useMemo(() => {
    const set = new Set<string>(available.map((w) => w.category));
    return ['همه', ...Array.from(set)];
  }, [available]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return available
      .filter((w) => (cat === 'همه' ? true : w.category === cat))
      .filter((w) => {
        if (!s) return true;
        return (
          w.title.toLowerCase().includes(s) ||
          w.category.toLowerCase().includes(s) ||
          (w.id || '').toLowerCase().includes(s)
        );
      });
  }, [available, q, cat]);

  if (!open) return null;

  const hasFilters = q.trim().length > 0 || cat !== 'همه';

  return createPortal((
    <div data-ui-dashboard-modal="add-widget" data-kourosh-overlay="backdrop" className="dashboard-add-widget-overlay fixed inset-0 z-[2147483646] flex items-center justify-center px-3">
      <div data-kourosh-overlay="backdrop" className="ux-overlay-backdrop dashboard-add-widget-backdrop absolute inset-0 bg-black/35" onClick={onClose} />

      <div
        dir="rtl"
        data-ui-dashboard-surface="add-widget-modal"
        data-ui-modal-variant="expansive"
        data-kourosh-overlay="panel"
        className="ux-stable-panel ux-stable-modal-panel dashboard-add-widget-modal dashboard-add-widget-modal--executive relative w-[min(1040px,96vw)] overflow-hidden rounded-3xl bg-white shadow-[0_20px_90px_rgba(0,0,0,0.18)] ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800"
      >
        <div className="dashboard-add-widget-modal__header dashboard-add-widget-modal__header--executive px-6 py-5 border-b border-black/5 dark:border-white/10">
          <div className="dashboard-add-widget-modal__heading flex items-start justify-between gap-3">
            <div className="dashboard-add-widget-titlebar min-w-0">
              <div className="dashboard-add-widget-titlebar__icon inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <i className="fa-solid fa-grid-2 text-indigo-700 dark:text-indigo-300" />
              </div>
              <div className="dashboard-add-widget-titlebar__copy min-w-0">
                <div className="dashboard-add-widget-kicker">مدیریت کارت‌های داشبورد</div>
                <h3 className="dashboard-add-widget-title text-lg font-extrabold text-gray-900 dark:text-white">افزودن کارت جدید</h3>
                <p className="dashboard-add-widget-subtitle text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                  کارت مورد نیاز را انتخاب کنید؛ پس از افزودن، ترتیب و اندازه آن از حالت ویرایش داشبورد قابل تنظیم است.
                </p>
              </div>
            </div>

            <button
              data-ui-dashboard-command="close-add-widget"
              className="app-command-button dashboard-add-widget-close w-10 h-10 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 transition flex items-center justify-center"
              onClick={onClose}
              title="بستن"
              aria-label="بستن پنجره افزودن کارت"
            >
              <i className="fa-solid fa-xmark text-gray-700 dark:text-gray-200" />
            </button>
          </div>

          <div className="dashboard-add-widget-summary" aria-label="خلاصه کارت‌های قابل افزودن">
            <div className="dashboard-add-widget-summary__item">
              <span>قابل افزودن</span>
              <strong>{available.length.toLocaleString('fa-IR')}</strong>
            </div>
            <div className="dashboard-add-widget-summary__item">
              <span>یافت‌شده</span>
              <strong>{filtered.length.toLocaleString('fa-IR')}</strong>
            </div>
            <div className="dashboard-add-widget-summary__item">
              <span>دسته فعال</span>
              <strong>{cat}</strong>
            </div>
          </div>

          <div className="dashboard-add-widget-controls mt-4 flex flex-col sm:flex-row gap-3">
            <label className="dashboard-add-widget-search relative flex-1">
              <span className="sr-only">جستجو در کارت‌های داشبورد</span>
              <i className="fa-solid fa-magnifying-glass dashboard-add-widget-search__icon absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="جستجو در نام، دسته یا شناسه کارت…"
                data-ui-field="true" data-ui-control="true" data-ui-control-kind="dashboard-widget-search"
                className="app-form-control dashboard-add-widget-search__input w-full h-10 pr-11 pl-3 rounded-2xl bg-black/5 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10    text-sm"
              />
              {q.trim() ? (
                <button
                  type="button"
                  onClick={() => setQ('')}
                  data-ui-dashboard-command="clear-widget-search"
                  className="app-command-button dashboard-add-widget-search__clear"
                  aria-label="پاک کردن جستجوی کارت‌ها"
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              ) : null}
            </label>

            <div className="dashboard-add-widget-categories flex gap-2 overflow-auto no-scrollbar" role="tablist" aria-label="دسته‌بندی کارت‌ها">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  data-ui-dashboard-filter-chip={c}
                  className={[
                    'dashboard-add-widget-category h-10 px-3.5 rounded-2xl text-sm font-bold transition ring-1 whitespace-nowrap',
                    cat === c
                      ? 'dashboard-add-widget-category--active bg-slate-900 text-white ring-slate-900/20 shadow-sm dark:bg-slate-100 dark:text-slate-900 dark:ring-white/20'
                      : 'bg-white text-gray-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-950 dark:text-gray-200 dark:ring-slate-800 dark:hover:bg-slate-900',
                  ].join(' ')}
                  aria-pressed={cat === c}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard-add-widget-modal__body dashboard-add-widget-modal__body--executive px-6 py-5">
          {filtered.length === 0 ? (
            <div className="dashboard-add-widget-empty h-44 flex flex-col items-center justify-center text-center rounded-3xl bg-slate-50 dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800">
              <div className="dashboard-add-widget-empty__icon w-12 h-12 rounded-2xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 flex items-center justify-center">
                <i className="fa-solid fa-box-open text-gray-600 dark:text-gray-300" />
              </div>
              <div className="mt-3 text-sm font-extrabold text-gray-900 dark:text-white">کارت مناسبی پیدا نشد</div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">عبارت عبارت جستجو یا دسته‌بندی را تغییر دهید.</div>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQ('');
                    setCat('همه');
                  }}
                  data-ui-dashboard-command="reset-widget-filter"
                  className="app-command-button dashboard-add-widget-empty__reset"
                >
                  نمایش همه کارت‌ها
                </button>
              ) : null}
            </div>
          ) : (
            <div className="dashboard-add-widget-grid grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((w) => {
                const a = accentToClasses(w.accent);
                return (
                  <div
                    key={w.id}
                    data-ui-dashboard-add-card={w.id}
                    data-dashboard-widget-category={w.category}
                    className="dashboard-add-widget-card dashboard-add-widget-card--executive group rounded-3xl bg-white dark:bg-slate-950 ring-1 ring-slate-200 dark:ring-slate-800 p-4 hover:shadow-lg hover:shadow-black/5 transition"
                  >
                    <div className="dashboard-add-widget-card__main flex items-start justify-between gap-3">
                      <div className="dashboard-add-widget-card__identity flex items-start gap-3 min-w-0">
                        <span
                          className={[
                            'dashboard-add-widget-card__icon w-11 h-11 rounded-2xl flex items-center justify-center',
                            'bg-gradient-to-br',
                            a.bg,
                            'ring-1',
                            a.ring,
                          ].join(' ')}
                        >
                          <i className={`${w.icon || 'fa-solid fa-square-poll-vertical'} ${a.icon}`} />
                        </span>

                        <div className="dashboard-add-widget-card__copy min-w-0">
                          <div className="dashboard-add-widget-card__title text-sm font-extrabold text-gray-900 dark:text-white truncate">{w.title}</div>
                          <div className="dashboard-add-widget-card__meta mt-0.5 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <span className="dashboard-add-widget-card__chip px-2 py-1 rounded-full bg-black/5 dark:bg-white/10 ring-1 ring-black/5 dark:ring-white/10">
                              {w.category}
                            </span>
                            <span className="opacity-70">•</span>
                            <span className="dashboard-add-widget-card__id" dir="ltr">{w.id}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onAdd(w.id)}
                        data-ui-dashboard-command="add-widget"
                        className="app-command-button dashboard-add-widget-card__add h-9 px-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold transition flex items-center gap-2 shadow-sm ring-1 ring-black/5 dark:ring-white/10"
                      >
                        <i className="fa-solid fa-plus" />
                        افزودن
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dashboard-add-widget-modal__footer dashboard-add-widget-modal__footer--executive px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between gap-3">
          <div className="dashboard-add-widget-footnote text-xs text-gray-600 dark:text-gray-300">
            کارت‌های افزوده‌شده از حالت ویرایش داشبورد قابل جابه‌جایی، تغییر اندازه و مخفی‌سازی هستند.
          </div>
          <button
            data-ui-dashboard-command="done-add-widget"
            className="app-command-button dashboard-add-widget-done h-9 px-3.5 rounded-2xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 transition text-sm font-extrabold"
            onClick={onClose}
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  ), document.body);
}
