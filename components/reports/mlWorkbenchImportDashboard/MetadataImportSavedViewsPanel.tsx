import React from 'react';
import type { AnnotationSavedView, AnnotationSavedViewId, AnnotationSavedViewsPayload } from './metadataImportDashboardTypes';
import { nf } from './metadataImportDashboardUtils';

type Props = {
  savedViewsPayload: AnnotationSavedViewsPayload | null;
  savedViews: AnnotationSavedView[];
  savedViewsLoading: boolean;
  savedViewsError?: string | null;
  activeSavedViewId: AnnotationSavedViewId | '';
  annotationLoading: boolean;
  onApplySavedView: (presetId: AnnotationSavedViewId | string) => void;
};

function MetadataImportSavedViewsPanel({ savedViewsPayload, savedViews, savedViewsLoading, savedViewsError, activeSavedViewId, annotationLoading, onApplySavedView }: Props) {
  return (
    <div className="rounded-2xl border border-sky-100 bg-white p-3 dark:border-sky-900/50 dark:bg-slate-950/60" aria-label="Phase 11I annotation saved views">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <strong className="text-xs font-black text-slate-800 dark:text-white">Phase 11I · Saved Views & Quick Presets</strong>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">Presetهای سریع فقط فیلترهای read-only را روی annotation search اعمال می‌کنند؛ annotation یا import result را تغییر نمی‌دهند.</p>
        </div>
        <span className="text-xs font-black text-slate-500">{savedViewsLoading ? 'Loading presets…' : `${nf.format(savedViewsPayload?.summary?.savedViewCount || savedViews.length)} presets`}</span>
      </div>
      {savedViewsError ? <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{savedViewsError}</p> : null}
      {savedViews.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {savedViews.map((view) => {
            const active = activeSavedViewId === view.id;
            return (
              <button
                key={view.id}
                type="button"
                className={`rounded-2xl border px-3 py-2 text-[11px] font-black transition hover:-translate-y-0.5 ${active ? 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-200'}`}
                onClick={() => onApplySavedView(view.id)}
                disabled={annotationLoading}
                title={view.description || view.label || view.id}
              >
                <i className="fa-solid fa-bookmark ml-1" /> {view.label || view.id}
              </button>
            );
          })}
        </div>
      ) : !savedViewsLoading ? <p className="mt-2 text-xs font-bold text-slate-500">هیچ saved view آماده‌ای برای فیلتر annotation وجود ندارد.</p> : null}
    </div>
  );
}

export default React.memo(MetadataImportSavedViewsPanel);
