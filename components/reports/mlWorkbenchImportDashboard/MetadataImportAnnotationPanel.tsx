import { SelectField, TextareaField } from '@/components/ui';
import React from 'react';
import type {
  AnnotationSavedView,
  AnnotationSavedViewId,
  AnnotationSavedViewsPayload,
  AnnotationSavedViewUsagePayload,
  AnnotationSavedViewUsageRow,
  ReviewAnnotation,
  ReviewAnnotationKind,
  ReviewAnnotationsPayload,
  ReviewAnnotationScope,
  ReviewAnnotationSeverity,
} from './metadataImportDashboardTypes';
import { labelStatus, nf } from './metadataImportDashboardUtils';
import MetadataImportAnnotationSearchPanel from './MetadataImportAnnotationSearchPanel';
import MetadataImportSavedViewsPanel from './MetadataImportSavedViewsPanel';
import MetadataImportSavedViewUsagePanel from './MetadataImportSavedViewUsagePanel';

type Props = {
  open: boolean;
  annotationPayload: ReviewAnnotationsPayload | null;
  annotationLoading: boolean;
  annotationError?: string | null;
  annotationSaving: boolean;
  annotations: ReviewAnnotation[];
  noteTargetCandidateId: string;
  activeSavedViewId: AnnotationSavedViewId | '';
  savedViewsPayload: AnnotationSavedViewsPayload | null;
  savedViews: AnnotationSavedView[];
  savedViewsLoading: boolean;
  savedViewsError?: string | null;
  savedViewUsagePayload: AnnotationSavedViewUsagePayload | null;
  savedViewUsageRows: AnnotationSavedViewUsageRow[];
  savedViewUsageLoading: boolean;
  savedViewUsageError?: string | null;
  noteText: string;
  setNoteText: (value: string) => void;
  noteScope: ReviewAnnotationScope;
  setNoteScope: (value: ReviewAnnotationScope) => void;
  noteKind: ReviewAnnotationKind;
  setNoteKind: (value: ReviewAnnotationKind) => void;
  noteSeverity: ReviewAnnotationSeverity;
  setNoteSeverity: (value: ReviewAnnotationSeverity) => void;
  annotationSearchQuery: string;
  setAnnotationSearchQuery: (value: string) => void;
  annotationFilterScope: ReviewAnnotationScope | '';
  setAnnotationFilterScope: (value: ReviewAnnotationScope | '') => void;
  annotationFilterKind: ReviewAnnotationKind | '';
  setAnnotationFilterKind: (value: ReviewAnnotationKind | '') => void;
  annotationFilterSeverity: ReviewAnnotationSeverity | '';
  setAnnotationFilterSeverity: (value: ReviewAnnotationSeverity | '') => void;
  annotationFilterCandidate: string;
  setAnnotationFilterCandidate: (value: string) => void;
  annotationFilterCreatedFrom: string;
  setAnnotationFilterCreatedFrom: (value: string) => void;
  annotationFilterCreatedTo: string;
  setAnnotationFilterCreatedTo: (value: string) => void;
  onApplySavedView: (presetId: AnnotationSavedViewId | string) => void;
  onSubmitFilters: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetFilters: () => void;
  onSaveAnnotation: (event: React.FormEvent<HTMLFormElement>) => void;
  onOpen: () => void;
};

function MetadataImportAnnotationPanel(props: Props) {
  const annotationSummary = props.annotationPayload?.summary;

  if (!props.open) {
    return (
      <button type="button" className="mlwb-v212-preview mt-4" aria-label="پیش‌نمایش فضای یادداشت و مرور" aria-expanded={false} onClick={props.onOpen}>
        <span className="mlwb-v212-preview__eyebrow text-emerald-500">فاز 11G تا 11K · جمع‌شده</span>
        <strong className="mlwb-v212-preview__title">فضای یادداشت و مرور</strong><span className="mlwb-v212-preview__desc">یادداشت‌ها، جستجو، نماهای ذخیره‌شده و خلاصه استفاده فعلاً بسته است. این بخش فقط روی متادیتا کار می‌کند و رهگیری رفتار یا تغییر عملیاتی ندارد.</span><span className="mlwb-v212-preview__meta"><em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-note-sticky" /> فقط متادیتا</em><em className="mlwb-v212-chip not-italic"><i className="fa-solid fa-magnifying-glass" /> جستجو و فیلتر</em></span>
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-[24px] border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900" aria-label="Phase 11K annotation workspace density cleanup">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="text-[11px] font-black tracking-[0.08em] text-emerald-500">فاز 11K · فضای یادداشت و مرور</span>
          <span className="sr-only">Phase 11G · Review Notes & Operator Annotations</span>
          <h4 className="mt-1 text-sm font-black text-slate-950 dark:text-white">فضای فشرده برای یادداشت، جستجو و نماهای ذخیره‌شده</h4>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">فازهای 11G تا 11J در یک command center فشرده جمع شده‌اند؛ رکوردهای annotation همچنان فقط متادیتا هستند و نتیجه import، مدل، inference/activation یا workflow حاکمیتی را تغییر نمی‌دهند.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{props.annotationLoading ? 'در حال دریافت…' : labelStatus(annotationSummary?.status)}</div>
      </div>
      <div className="mt-3 grid gap-2 rounded-2xl border border-slate-100 bg-white p-2 text-[11px] font-black text-slate-500 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400" aria-label="Phase 11K compact annotation command strip">
        <span className="truncate"><i className="fa-solid fa-bullseye ml-1" /> Target: {props.noteTargetCandidateId || '—'}</span>
        <span className="truncate"><i className="fa-solid fa-bookmark ml-1" /> Preset: {props.activeSavedViewId || 'Manual filters'}</span>
        <span><i className="fa-solid fa-filter ml-1" /> Filters: {nf.format(annotationSummary?.filterCount || 0)}</span>
        <span><i className="fa-solid fa-user-shield ml-1" /> Behavior tracking: No</span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-4">
        <article className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">Annotations</small><strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{props.annotationLoading ? '…' : nf.format(annotationSummary?.annotationCount || 0)}</strong><em className="not-italic text-xs text-slate-500">Safe: {nf.format(annotationSummary?.safeAnnotationCount || 0)}</em></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">Watch / Warning</small><strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{props.annotationLoading ? '…' : `${nf.format(annotationSummary?.watchCount || 0)} / ${nf.format(annotationSummary?.warningCount || 0)}`}</strong><em className="not-italic text-xs text-slate-500">Resolved: {nf.format(annotationSummary?.resolvedCount || 0)}</em></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">Trend notes</small><strong className="mt-1 block text-lg font-black text-slate-900 dark:text-white">{props.annotationLoading ? '…' : nf.format(annotationSummary?.trendSignalCount || 0)}</strong><em className="not-italic text-xs text-slate-500">Offline notes: {nf.format(annotationSummary?.offlineMetricsComparisonCount || 0)}</em></article>
        <article className="rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60"><small className="text-xs font-bold text-slate-500">Target</small><strong className="mt-1 block truncate text-sm font-black text-slate-900 dark:text-white">{props.noteTargetCandidateId || '—'}</strong><em className="not-italic text-xs text-slate-500">Annotation only</em></article>
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[0.95fr_1.05fr]" aria-label="Phase 11K compact saved view workspace">
        <MetadataImportSavedViewsPanel {...props} onApplySavedView={props.onApplySavedView} />
        <MetadataImportSavedViewUsagePanel {...props} onApplySavedView={props.onApplySavedView} />
      </div>
      <div className="mt-3 grid gap-3 xl:grid-cols-[1.08fr_0.92fr]" aria-label="Phase 11K compact annotation forms">
        <MetadataImportAnnotationSearchPanel
          annotationSearchQuery={props.annotationSearchQuery}
          setAnnotationSearchQuery={props.setAnnotationSearchQuery}
          annotationFilterCandidate={props.annotationFilterCandidate}
          setAnnotationFilterCandidate={props.setAnnotationFilterCandidate}
          annotationFilterSeverity={props.annotationFilterSeverity}
          setAnnotationFilterSeverity={props.setAnnotationFilterSeverity}
          annotationFilterScope={props.annotationFilterScope}
          setAnnotationFilterScope={props.setAnnotationFilterScope}
          annotationFilterKind={props.annotationFilterKind}
          setAnnotationFilterKind={props.setAnnotationFilterKind}
          annotationFilterCreatedFrom={props.annotationFilterCreatedFrom}
          setAnnotationFilterCreatedFrom={props.setAnnotationFilterCreatedFrom}
          annotationFilterCreatedTo={props.annotationFilterCreatedTo}
          setAnnotationFilterCreatedTo={props.setAnnotationFilterCreatedTo}
          annotationFilterCount={annotationSummary?.filterCount || 0}
          annotationResultCount={annotationSummary?.resultCount ?? props.annotations.length}
          activeSavedViewId={props.activeSavedViewId}
          onSubmit={props.onSubmitFilters}
          onReset={props.onResetFilters}
        />
        {props.annotationError ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">{props.annotationError}</p> : null}
        <form className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950/60" onSubmit={props.onSaveAnnotation}>
          <div className="grid gap-2 md:grid-cols-3">
            <SelectField controlOnly unstyled showChevron={false} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={props.noteScope} onChange={(event) => props.setNoteScope(event.target.value as ReviewAnnotationScope)}><option value="metadata_result">نتیجه متادیتا</option><option value="trend_signal">سیگنال روند</option><option value="offline_metrics_comparison">متریک‌های آفلاین</option><option value="dashboard">داشبورد</option></SelectField>
            <SelectField controlOnly unstyled showChevron={false} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={props.noteKind} onChange={(event) => props.setNoteKind(event.target.value as ReviewAnnotationKind)}><option value="operator_note">یادداشت اپراتور</option><option value="review_note">یادداشت مرور</option><option value="risk_note">یادداشت ریسک</option><option value="follow_up">پیگیری</option><option value="dismissed_signal">سیگنال ردشده</option></SelectField>
            <SelectField controlOnly unstyled showChevron={false} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" value={props.noteSeverity} onChange={(event) => props.setNoteSeverity(event.target.value as ReviewAnnotationSeverity)}><option value="info">اطلاعاتی</option><option value="watch">نیازمند توجه</option><option value="warning">هشدار</option><option value="resolved">حل‌شده</option></SelectField>
          </div>
          <TextareaField controlOnly className="min-h-[76px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" value={props.noteText} onChange={(event) => props.setNoteText(event.target.value.slice(0, 1600))} placeholder="یادداشت کوتاه اپراتور برای context result یا signal؛ نه تاییدیه، نه فعال‌سازی، نه تغییر تجاری." maxLength={1600} />
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between"><span className="text-xs font-bold text-slate-500">فقط متادیتا · فقط رکورد یادداشت ثبت می‌شود · نتایج import بدون تغییر می‌مانند</span><button type="submit" className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 px-4 py-2 text-xs font-black text-emerald-700 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/60 dark:text-emerald-200" disabled={props.annotationSaving || !props.noteText.trim() || !props.noteTargetCandidateId}><i className="fa-solid fa-note-sticky ml-1" /> {props.annotationSaving ? 'در حال ثبت…' : 'ثبت یادداشت'}</button></div>
        </form>
      </div>
      {props.annotations.length ? <div className="mt-3 grid gap-2">{props.annotations.map((item, index) => (<div key={`${item.id || item.candidatePackageId || index}-review-annotation`} className="rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60"><div className="flex items-start justify-between gap-3"><strong className="break-all font-black text-slate-800 dark:text-white">{item.candidatePackageId || '—'}</strong><span className="font-black text-slate-500">{labelStatus(item.severity)}</span></div><p className="mt-1 font-bold text-slate-600 dark:text-slate-300">{item.noteText || '—'}</p><p className="mt-1 text-[11px] font-bold text-slate-400">{item.annotationScope || 'metadata_result'} · {item.annotationKind || 'operator_note'} · {item.createdAt || '—'}</p></div>))}</div> : !props.annotationLoading ? <p className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">هنوز یادداشت اپراتور برای metadata resultها ثبت نشده است.</p> : null}
    </div>
  );
}

export default React.memo(MetadataImportAnnotationPanel);
